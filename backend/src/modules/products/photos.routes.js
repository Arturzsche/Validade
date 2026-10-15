import express, { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { HttpError, notFound } from '../../lib/httpError.js';
import { idParams } from '../../lib/schemas.js';
import { serializeProduct } from '../../lib/serializers.js';
import { validate } from '../../middlewares/validate.js';

// Foto da embalagem tirada pelo celular do operador. O app já reduz a imagem no aparelho
// (~640px, JPEG); o limite aqui é só uma rede de proteção.
const MAX_BYTES = 1.5 * 1024 * 1024;
const MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/** Confere o conteúdo real (bytes mágicos), não só o Content-Type declarado. */
function sniffImage(buf) {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buf.length > 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  return null;
}

/** Rotas autenticadas, montadas em /api/products. */
export const productPhotoRoutes = Router();

// PUT /api/products/:id/photo — corpo binário (image/jpeg|png|webp). Operador também pode.
productPhotoRoutes.put(
  '/:id/photo',
  validate({ params: idParams }),
  express.raw({ type: MIME_TYPES, limit: MAX_BYTES }),
  async (req, res) => {
    const product = await prisma.product.findFirst({
      where: { id: req.valid.params.id, storeId: req.user.storeId, archivedAt: null },
    });
    if (!product) throw notFound('Produto não encontrado');

    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      throw new HttpError(415, 'UNSUPPORTED_IMAGE', 'Envie uma foto JPEG, PNG ou WebP');
    }
    const mimeType = sniffImage(req.body);
    if (!mimeType) throw new HttpError(415, 'UNSUPPORTED_IMAGE', 'O arquivo não é uma imagem válida');

    const now = new Date();
    const [, updated] = await prisma.$transaction([
      prisma.productPhoto.upsert({
        where: { productId: product.id },
        create: { productId: product.id, mimeType, data: req.body },
        update: { mimeType, data: req.body },
      }),
      prisma.product.update({ where: { id: product.id }, data: { photoUpdatedAt: now } }),
    ]);
    res.json(serializeProduct(updated));
  },
);

// DELETE /api/products/:id/photo — volta para o ícone da categoria
productPhotoRoutes.delete('/:id/photo', validate({ params: idParams }), async (req, res) => {
  const product = await prisma.product.findFirst({ where: { id: req.valid.params.id, storeId: req.user.storeId } });
  if (!product) throw notFound('Produto não encontrado');
  await prisma.$transaction([
    prisma.productPhoto.deleteMany({ where: { productId: product.id } }),
    prisma.product.update({ where: { id: product.id }, data: { photoUpdatedAt: null } }),
  ]);
  res.status(204).end();
});

/**
 * Rota pública (sem login), montada em /api/public: a tag <img> não envia o token.
 * O endereço só é conhecido por quem já vê o produto (UUID aleatório) e é versionado
 * (?v=), então pode ser cacheado para sempre.
 */
export const publicPhotoRoutes = Router();

publicPhotoRoutes.get(
  '/product-photos/:id',
  validate({ params: z.object({ id: z.uuid() }) }),
  async (req, res) => {
    const photo = await prisma.productPhoto.findUnique({ where: { productId: req.valid.params.id } });
    if (!photo) throw notFound('Foto não encontrada');
    res.set({
      'Content-Type': photo.mimeType,
      'Cache-Control': 'public, max-age=31536000, immutable',
      // helmet manda same-origin por padrão; o frontend (outro domínio) precisa exibir a imagem
      'Cross-Origin-Resource-Policy': 'cross-origin',
    });
    res.send(Buffer.from(photo.data));
  },
);
