import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { notFound } from '../../lib/httpError.js';
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
  price: money,
  costPrice: money.optional(),
});

const listQuery = z.object({ search: z.string().trim().optional(), ...pagination });

async function findOwnProduct(storeId, id) {
  const product = await prisma.product.findFirst({ where: { id, storeId } });
  if (!product) throw notFound('Produto não encontrado');
  return product;
}

// GET /api/products?search=&page=&pageSize=
router.get('/', validate({ query: listQuery }), async (req, res) => {
  const { search, page, pageSize } = req.valid.query;
  const where = {
    storeId: req.user.storeId,
    ...(search && {
      OR: [{ name: { contains: search, mode: 'insensitive' } }, { barcode: { startsWith: search } }],
    }),
  };
  const [items, total] = await prisma.$transaction([
    prisma.product.findMany({ where, orderBy: { name: 'asc' }, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.product.count({ where }),
  ]);
  res.json({ items: items.map(serializeProduct), total, page, pageSize });
});

// GET /api/products/barcode/:barcode — usado logo após a leitura da câmera
router.get('/barcode/:barcode', validate({ params: z.object({ barcode }) }), async (req, res) => {
  const product = await prisma.product.findUnique({
    where: { storeId_barcode: { storeId: req.user.storeId, barcode: req.valid.params.barcode } },
  });
  if (!product) throw notFound('Produto ainda não cadastrado nesta loja');
  res.json(serializeProduct(product));
});

// GET /api/products/:id
router.get('/:id', validate({ params: idParams }), async (req, res) => {
  res.json(serializeProduct(await findOwnProduct(req.user.storeId, req.valid.params.id)));
});

// POST /api/products — operador também pode cadastrar (produto novo no balcão)
router.post('/', validate({ body: productInput }), async (req, res) => {
  const product = await prisma.product.create({ data: { ...req.valid.body, storeId: req.user.storeId } });
  res.status(201).json(serializeProduct(product));
});

// PATCH /api/products/:id — preço/custo são decisões do dono
router.patch(
  '/:id',
  requireOwner,
  validate({ params: idParams, body: productInput.extend({ costPrice: money.nullable() }).partial() }),
  async (req, res) => {
    const current = await findOwnProduct(req.user.storeId, req.valid.params.id);
    const product = await prisma.product.update({ where: { id: current.id }, data: req.valid.body });
    res.json(serializeProduct(product));
  },
);

// DELETE /api/products/:id — bloqueado (409) se houver lotes vinculados
router.delete('/:id', requireOwner, validate({ params: idParams }), async (req, res) => {
  const current = await findOwnProduct(req.user.storeId, req.valid.params.id);
  await prisma.product.delete({ where: { id: current.id } });
  res.status(204).end();
});

export default router;
