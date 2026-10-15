import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { notFound } from '../../lib/httpError.js';
import { idParams, pagination, phone } from '../../lib/schemas.js';
import { serializeClient } from '../../lib/serializers.js';
import { validate } from '../../middlewares/validate.js';

const router = Router();

const clientInput = z.object({
  name: z.string().trim().min(2).max(120),
  phone: phone.nullable().optional(),
  address: z.string().trim().max(300).nullable().optional(),
});

const listQuery = z.object({ search: z.string().trim().optional(), ...pagination });

/** Cliente do prestador logado (nunca de outro). */
export async function findOwnClient(userId, id) {
  const client = await prisma.client.findFirst({ where: { id, userId } });
  if (!client) throw notFound('Cliente não encontrado');
  return client;
}

// GET /api/clients?search=&page=&pageSize=
router.get('/', validate({ query: listQuery }), async (req, res) => {
  const { search, page, pageSize } = req.valid.query;
  const where = { userId: req.user.id, ...(search && { name: { contains: search, mode: 'insensitive' } }) };
  const [items, total] = await prisma.$transaction([
    prisma.client.findMany({
      where,
      include: { _count: { select: { quotes: true } } },
      orderBy: { name: 'asc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.client.count({ where }),
  ]);
  res.json({ items: items.map(serializeClient), total, page, pageSize });
});

// POST /api/clients
router.post('/', validate({ body: clientInput }), async (req, res) => {
  const client = await prisma.client.create({ data: { ...req.valid.body, userId: req.user.id } });
  res.status(201).json(serializeClient(client));
});

// GET /api/clients/:id
router.get('/:id', validate({ params: idParams }), async (req, res) => {
  res.json(serializeClient(await findOwnClient(req.user.id, req.valid.params.id)));
});

// PATCH /api/clients/:id
router.patch(
  '/:id',
  validate({ params: idParams, body: clientInput.partial().refine((d) => Object.keys(d).length > 0, 'Nada para atualizar') }),
  async (req, res) => {
    const current = await findOwnClient(req.user.id, req.valid.params.id);
    const client = await prisma.client.update({ where: { id: current.id }, data: req.valid.body });
    res.json(serializeClient(client));
  },
);

// DELETE /api/clients/:id — cliente com orçamentos não é apagado (409 IN_USE): preserva o histórico
router.delete('/:id', validate({ params: idParams }), async (req, res) => {
  const current = await findOwnClient(req.user.id, req.valid.params.id);
  await prisma.client.delete({ where: { id: current.id } });
  res.status(204).end();
});

export default router;
