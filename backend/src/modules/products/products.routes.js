import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { conflict, notFound } from '../../lib/httpError.js';
import { barcode, idParams, money, pagination } from '../../lib/schemas.js';
import { serializeProduct } from '../../lib/serializers.js';
import { requireOwner } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';

const router = Router();

export const productInput = z.object({
  barcode,
  name: z.string().trim().min(2).max(120),
  brand: z.string().trim().max(60).optional(),
  category: z.string().trim().max(60).optional(),
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
  res.json({ items: items.map(serializeProduct), total, page, pageSize });
});

// GET /api/products/barcode/:barcode — usado logo após a leitura da câmera
router.get('/barcode/:barcode', validate({ params: z.object({ barcode }) }), async (req, res) => {
  const product = await prisma.product.findFirst({
    where: { storeId: req.user.storeId, barcode: req.valid.params.barcode, ...visible },
  });
  if (!product) throw notFound('Produto ainda não cadastrado nesta loja');
  res.json(serializeProduct(product));
});

// GET /api/products/:id
router.get('/:id', validate({ params: idParams }), async (req, res) => {
  res.json(serializeProduct(await findOwnProduct(req.user.storeId, req.valid.params.id)));
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
  res.status(201).json(serializeProduct(product));
});

// PATCH /api/products/:id — nome, preço e custo são decisões do dono.
// O código de barras não muda (é a identidade do produto na leitura).
router.patch(
  '/:id',
  requireOwner,
  validate({
    params: idParams,
    body: productInput
      .omit({ barcode: true })
      .extend({ costPrice: money.nullable() })
      .partial()
      .refine((d) => Object.keys(d).length > 0, 'Nada para atualizar'),
  }),
  async (req, res) => {
    const current = await findOwnProduct(req.user.storeId, req.valid.params.id);
    const product = await prisma.product.update({
      where: { id: current.id },
      data: req.valid.body,
      include: withActiveCount,
    });
    res.json(serializeProduct(product));
  },
);

/**
 * DELETE /api/products/:id — tira o produto do catálogo sem apagar histórico:
 *  - com itens ativos na prateleira: 409 (excluir esconderia um vencimento real)
 *  - só com histórico de validades: arquiva (soft delete)
 *  - sem nenhum registro: apaga de vez
 */
router.delete('/:id', requireOwner, validate({ params: idParams }), async (req, res) => {
  const current = await findOwnProduct(req.user.storeId, req.valid.params.id);
  const [active, any] = await prisma.$transaction([
    prisma.batch.count({ where: { productId: current.id, ...activeStock } }),
    prisma.batch.count({ where: { productId: current.id } }),
  ]);

  if (active > 0) {
    throw conflict(
      'PRODUCT_HAS_ACTIVE_STOCK',
      `Este produto ainda tem ${active} ${active === 1 ? 'registro' : 'registros'} de validade na prateleira. Dê baixa antes de excluir.`,
    );
  }

  if (any > 0) {
    await prisma.product.update({ where: { id: current.id }, data: { archivedAt: new Date() } });
    return res.json({ archived: true });
  }

  await prisma.product.delete({ where: { id: current.id } });
  res.json({ archived: false });
});

export default router;
