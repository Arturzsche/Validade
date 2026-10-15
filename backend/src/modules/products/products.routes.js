import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { Prisma } from '@prisma/client';
import { conflict, forbidden, notFound } from '../../lib/httpError.js';
import { barcode, idParams, money, pagination } from '../../lib/schemas.js';
import { serializeProduct, viewFor } from '../../lib/serializers.js';
import { requireOwner } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';

const router = Router();

export const productInput = z.object({
  barcode,
  name: z.string().trim().min(2).max(120),
  brand: z.string().trim().max(60).optional(),
  category: z.enum(['FOOD', 'DRINKS', 'CLEANING', 'PETS', 'OTHER']).optional(),
  imageUrl: z.url({ protocol: /^https$/ }).max(500).optional(),
  price: money,
  costPrice: money.optional(),
});

const listQuery = z.object({ search: z.string().trim().optional(), ...pagination });

// Produtos arquivados (excluídos do catálogo) ficam invisíveis para a API
const visible = { archivedAt: null };
const activeStock = { status: 'ACTIVE', quantity: { gt: 0 } };

async function findOwnProduct(storeId, id) {
  const product = await prisma.product.findFirst({ where: { id, storeId, ...visible } });
  if (!product) throw notFound('Produto não encontrado');
  return product;
}

const withActiveCount = { _count: { select: { batches: { where: activeStock } } } };

// Busca sem acento e sem maiúsculas ("cafe" encontra "Café"). translate() é SQL puro:
// não depende da extensão unaccent, que nem todo Postgres gerenciado habilita.
const ACCENTED = 'áàâãäéèêëíìîïóòôõöúùûüçñ';
const PLAIN = 'aaaaaeeeeiiiiooooouuuucn';
const fold = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const escapeLike = (s) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

/** IDs dos produtos visíveis cujo nome contém o termo (sem acento) ou cujo código começa com ele. */
async function searchProductIds(storeId, search) {
  const term = `%${escapeLike(fold(search))}%`;
  const prefix = `${escapeLike(search)}%`;
  const rows = await prisma.$queryRaw`
    SELECT id FROM products
    WHERE store_id = ${storeId}::uuid AND archived_at IS NULL
      AND (translate(lower(name), ${ACCENTED}, ${PLAIN}) LIKE ${term} OR barcode LIKE ${prefix})`;
  return rows.map((r) => r.id);
}

// GET /api/products?search=&page=&pageSize= — catálogo (nome ou início do código de barras)
router.get('/', validate({ query: listQuery }), async (req, res) => {
  const { search, page, pageSize } = req.valid.query;
  const where = {
    storeId: req.user.storeId,
    ...visible,
    ...(search && { id: { in: await searchProductIds(req.user.storeId, search) } }),
  };
  const [items, total] = await prisma.$transaction([
    prisma.product.findMany({
      where,
      include: withActiveCount,
      orderBy: { name: 'asc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.product.count({ where }),
  ]);
  res.json({ items: items.map((p) => serializeProduct(p, viewFor(req.user))), total, page, pageSize });
});

// GET /api/products/barcode/:barcode — usado logo após a leitura da câmera
router.get('/barcode/:barcode', validate({ params: z.object({ barcode }) }), async (req, res) => {
  const product = await prisma.product.findFirst({
    where: { storeId: req.user.storeId, barcode: req.valid.params.barcode, ...visible },
  });
  if (!product) throw notFound('Produto ainda não cadastrado nesta loja');
  res.json(serializeProduct(product, viewFor(req.user)));
});

// GET /api/products/:id
router.get('/:id', validate({ params: idParams }), async (req, res) => {
  res.json(serializeProduct(await findOwnProduct(req.user.storeId, req.valid.params.id), viewFor(req.user)));
});

// POST /api/products — operador também pode cadastrar (produto novo no balcão).
// Se o código pertencia a um produto excluído do catálogo, ele volta com os dados novos.
router.post('/', validate({ body: productInput }), async (req, res) => {
  const { storeId } = req.user;
  const data = req.valid.body;
  const existing = await prisma.product.findUnique({ where: { storeId_barcode: { storeId, barcode: data.barcode } } });
  if (existing && !existing.archivedAt) throw conflict('ALREADY_EXISTS', 'Já existe um produto com este código de barras');

  const product = existing
    ? await prisma.product.update({ where: { id: existing.id }, data: { ...data, archivedAt: null } })
    : await prisma.product.create({ data: { ...data, storeId } });
  res.status(201).json(serializeProduct(product, viewFor(req.user)));
});

// PATCH /api/products/:id — operador corrige nome/marca/categoria; preço e custo são decisões do dono.
// O código de barras não muda (é a identidade do produto na leitura).
const OWNER_ONLY_FIELDS = ['price', 'costPrice'];

router.patch(
  '/:id',
  validate({
    params: idParams,
    body: productInput
      .omit({ barcode: true })
      .extend({ costPrice: money.nullable() })
      .partial()
      .refine((d) => Object.keys(d).length > 0, 'Nada para atualizar'),
  }),
  async (req, res) => {
    if (req.user.role !== 'OWNER' && OWNER_ONLY_FIELDS.some((f) => f in req.valid.body)) {
      throw forbidden('Só o dono da loja pode alterar preço e custo');
    }
    const current = await findOwnProduct(req.user.storeId, req.valid.params.id);
    const product = await prisma.product.update({
      where: { id: current.id },
      data: req.valid.body,
      include: withActiveCount,
    });
    res.json(serializeProduct(product, viewFor(req.user)));
  },
);

/**
 * DELETE /api/products/:id — tira o produto do catálogo SEM nunca quebrar a chave estrangeira
 * (Batch.product é Restrict de propósito: Cascade apagaria em silêncio o histórico de validades):
 *  - com registros de validade (ativos ou históricos): arquiva (soft delete). Itens ainda na
 *    prateleira continuam no painel e nos alertas até a baixa — nenhum vencimento some.
 *  - sem nenhum registro: apaga de vez (a foto vai junto, via cascade).
 *  - se um registro entrar entre a contagem e o delete (corrida), cai para arquivar.
 */
router.delete('/:id', requireOwner, validate({ params: idParams }), async (req, res) => {
  const current = await findOwnProduct(req.user.storeId, req.valid.params.id);
  const [onShelf, anyBatch] = await prisma.$transaction([
    prisma.batch.count({ where: { productId: current.id, ...activeStock } }),
    prisma.batch.count({ where: { productId: current.id } }),
  ]);

  const archive = async () => {
    await prisma.product.update({ where: { id: current.id }, data: { archivedAt: new Date() } });
    res.json({ archived: true, onShelf });
  };

  if (anyBatch > 0) return archive();

  try {
    await prisma.product.delete({ where: { id: current.id } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2003') return archive();
    throw err;
  }
  res.json({ archived: false, onShelf: 0 });
});

export default router;
