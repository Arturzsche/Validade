import { Router } from 'express';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { prisma } from '../../lib/prisma.js';
import { notFound } from '../../lib/httpError.js';
import { startOfMonthInTimeZone } from '../../lib/dates.js';
import { dateOnly, idParams, money, pagination, quantity, uuid } from '../../lib/schemas.js';
import { serializeQuote } from '../../lib/serializers.js';
import { validate } from '../../middlewares/validate.js';
import { findOwnClient } from '../clients/clients.routes.js';

const router = Router();

const STATUSES = ['PENDING', 'APPROVED', 'REJECTED'];

const itemInput = z.object({
  description: z.string().trim().min(1).max(300),
  quantity: quantity.default(1),
  unitPrice: money,
});

const createSchema = z.object({
  clientId: uuid,
  expiresAt: dateOnly.nullable().optional(),
  items: z.array(itemInput).min(1, 'Inclua ao menos um item').max(100),
});

const updateSchema = z
  .object({
    status: z.enum(STATUSES),
    expiresAt: dateOnly.nullable(),
    items: z.array(itemInput).min(1).max(100), // substitui todos os itens
  })
  .partial()
  .refine((d) => Object.keys(d).length > 0, 'Nada para atualizar');

const listQuery = z.object({ status: z.enum(STATUSES).optional(), clientId: uuid.optional(), ...pagination });

const withDetails = { client: true, items: { orderBy: { position: 'asc' } } };

/** Itens na ordem em que foram enviados. */
const withPositions = (items) => items.map((item, position) => ({ ...item, position }));

/** Total em centavos (evita erro de ponto flutuante) -> reais. */
const totalOf = (items) =>
  items.reduce((cents, i) => cents + Math.round(i.quantity * i.unitPrice * 100), 0) / 100;

/** Orçamentos do prestador = orçamentos dos clientes dele. */
const ownQuotes = (userId) => ({ client: { userId } });

async function findOwnQuote(userId, id) {
  const quote = await prisma.quote.findFirst({ where: { id, ...ownQuotes(userId) }, include: withDetails });
  if (!quote) throw notFound('Orçamento não encontrado');
  return quote;
}

/** Aprovar/rejeitar registra quando o cliente respondeu; voltar para pendente limpa. */
const respondedAtFor = (status) => (status === 'PENDING' ? null : new Date());

// GET /api/quotes/summary — números do Dashboard
router.get('/summary', async (req, res) => {
  const mine = ownQuotes(req.user.id);
  const monthStart = startOfMonthInTimeZone(env.APP_TIMEZONE);

  const [approvedMonth, pending, approvedAll, rejectedAll, recent] = await prisma.$transaction([
    prisma.quote.aggregate({
      where: { ...mine, status: 'APPROVED', respondedAt: { gte: monthStart } },
      _count: true,
      _sum: { totalAmount: true },
    }),
    prisma.quote.aggregate({ where: { ...mine, status: 'PENDING' }, _count: true, _sum: { totalAmount: true } }),
    prisma.quote.count({ where: { ...mine, status: 'APPROVED' } }),
    prisma.quote.count({ where: { ...mine, status: 'REJECTED' } }),
    prisma.quote.findMany({ where: mine, include: { client: true }, orderBy: { createdAt: 'desc' }, take: 5 }),
  ]);

  const answered = approvedAll + rejectedAll;
  const amount = (agg) => Number(agg._sum.totalAmount ?? 0);

  res.json({
    approvedThisMonth: { count: approvedMonth._count, amount: amount(approvedMonth) },
    pending: { count: pending._count, amount: amount(pending) },
    // Taxa de fechamento: aprovados ÷ orçamentos já respondidos (pendentes não contam)
    closeRate: { rate: answered ? approvedAll / answered : null, approved: approvedAll, answered },
    recent: recent.map(serializeQuote),
  });
});

// GET /api/quotes?status=&clientId=&page=&pageSize=
router.get('/', validate({ query: listQuery }), async (req, res) => {
  const { status, clientId, page, pageSize } = req.valid.query;
  const where = { ...ownQuotes(req.user.id), status, clientId };
  const [items, total] = await prisma.$transaction([
    prisma.quote.findMany({
      where,
      include: { client: true },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.quote.count({ where }),
  ]);
  res.json({ items: items.map(serializeQuote), total, page, pageSize });
});

// POST /api/quotes — { clientId, expiresAt?, items: [{ description, quantity, unitPrice }] }
router.post('/', validate({ body: createSchema }), async (req, res) => {
  const { clientId, expiresAt, items } = req.valid.body;
  await findOwnClient(req.user.id, clientId);
  const quote = await prisma.quote.create({
    data: { clientId, expiresAt, totalAmount: totalOf(items), items: { create: withPositions(items) } },
    include: withDetails,
  });
  res.status(201).json(serializeQuote(quote));
});

// GET /api/quotes/:id
router.get('/:id', validate({ params: idParams }), async (req, res) => {
  res.json(serializeQuote(await findOwnQuote(req.user.id, req.valid.params.id)));
});

// PATCH /api/quotes/:id — status (aprovar/rejeitar), validade ou itens
router.patch('/:id', validate({ params: idParams, body: updateSchema }), async (req, res) => {
  const current = await findOwnQuote(req.user.id, req.valid.params.id);
  const { status, expiresAt, items } = req.valid.body;

  const quote = await prisma.$transaction(async (tx) => {
    if (items) await tx.quoteItem.deleteMany({ where: { quoteId: current.id } });
    return tx.quote.update({
      where: { id: current.id },
      data: {
        expiresAt,
        ...(status && status !== current.status && { status, respondedAt: respondedAtFor(status) }),
        ...(items && { totalAmount: totalOf(items), items: { create: withPositions(items) } }),
      },
      include: withDetails,
    });
  });
  res.json(serializeQuote(quote));
});

// DELETE /api/quotes/:id
router.delete('/:id', validate({ params: idParams }), async (req, res) => {
  const current = await findOwnQuote(req.user.id, req.valid.params.id);
  await prisma.quote.delete({ where: { id: current.id } });
  res.status(204).end();
});

export default router;
