import { Router } from 'express';
import { z } from 'zod';
import { barcode, dateOnly, idParams, pagination, uuid } from '../../lib/schemas.js';
import { serializeBatch, viewFor } from '../../lib/serializers.js';
import { requireOwner } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { productInput } from '../products/products.routes.js';
import * as service from './batches.service.js';

const router = Router();

const quantity = z.number().int().min(1).max(100_000);

const createSchema = z.object({
  barcode,
  expiryDate: dateOnly,
  quantity,
  note: z.string().trim().max(280).optional(),
  // Mini-cadastro quando o código de barras ainda não existe na loja
  product: productInput.omit({ barcode: true }).optional(),
});

const listQuery = z.object({
  semaphore: z.enum(['red', 'yellow', 'green', 'expired']).optional(),
  status: z.enum(['ACTIVE', 'SOLD_OUT', 'DISCARDED']).default('ACTIVE'),
  productId: uuid.optional(),
  search: z.string().trim().optional(),
  ...pagination,
});

const updateSchema = z
  .object({
    expiryDate: dateOnly,
    quantity: z.number().int().min(0).max(100_000),
    status: z.enum(['ACTIVE', 'SOLD_OUT', 'DISCARDED']),
    note: z.string().trim().max(280).nullable(),
  })
  .partial()
  .refine((d) => Object.keys(d).length > 0, 'Nada para atualizar');

// POST /api/batches — entrada rápida (leitura do código de barras)
router.post('/', validate({ body: createSchema }), async (req, res) => {
  const { store, today } = await service.getStoreContext(req.user.storeId);
  const { batch, merged, productCreated } = await service.quickEntry({
    storeId: req.user.storeId,
    userId: req.user.id,
    input: req.valid.body,
  });

  res.status(merged ? 200 : 201).json({ merged, productCreated, batch: serializeBatch(batch, store, today, viewFor(req.user)) });
});

// GET /api/batches?semaphore=red|yellow|green|expired&status=&productId=&search=&page=&pageSize=
router.get('/', validate({ query: listQuery }), async (req, res) => {
  const { store, today } = await service.getStoreContext(req.user.storeId);
  const { page, pageSize } = req.valid.query;
  const { items, total } = await service.listBatches({
    storeId: req.user.storeId,
    store,
    today,
    filters: req.valid.query,
  });
  res.json({ items: items.map((b) => serializeBatch(b, store, today, viewFor(req.user))), total, page, pageSize });
});

// GET /api/batches/:id
router.get('/:id', validate({ params: idParams }), async (req, res) => {
  const { store, today } = await service.getStoreContext(req.user.storeId);
  const batch = await service.findOwnBatch(req.user.storeId, req.valid.params.id);
  res.json(serializeBatch(batch, store, today, viewFor(req.user)));
});

// PATCH /api/batches/:id — corrigir validade, dar baixa (quantity), descartar (status)
router.patch('/:id', validate({ params: idParams, body: updateSchema }), async (req, res) => {
  const { store, today } = await service.getStoreContext(req.user.storeId);
  const batch = await service.updateBatch({ storeId: req.user.storeId, id: req.valid.params.id, data: req.valid.body });
  res.json(serializeBatch(batch, store, today, viewFor(req.user)));
});

// DELETE /api/batches/:id — remover lançamento errado (dono)
router.delete('/:id', requireOwner, validate({ params: idParams }), async (req, res) => {
  await service.deleteBatch({ storeId: req.user.storeId, id: req.valid.params.id });
  res.status(204).end();
});

export default router;
