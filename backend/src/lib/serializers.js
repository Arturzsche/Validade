// Converte entidades do Prisma para o formato da API (Decimal -> number, DATE -> 'YYYY-MM-DD').
import { toDateOnly } from './dates.js';

const num = (d) => (d === null || d === undefined ? null : Number(d.toString()));

export function serializeClient(c) {
  return {
    id: c.id,
    name: c.name,
    phone: c.phone,
    address: c.address,
    createdAt: c.createdAt,
    ...(c._count && { quotesCount: c._count.quotes }),
  };
}

export function serializeQuote(q) {
  return {
    id: q.id,
    clientId: q.clientId,
    status: q.status,
    totalAmount: num(q.totalAmount),
    expiresAt: q.expiresAt ? toDateOnly(q.expiresAt) : null,
    respondedAt: q.respondedAt,
    createdAt: q.createdAt,
    ...(q.client && { client: { id: q.client.id, name: q.client.name, phone: q.client.phone, address: q.client.address } }),
    ...(q.items && {
      items: q.items.map((i) => ({
        id: i.id,
        description: i.description,
        quantity: num(i.quantity),
        unitPrice: num(i.unitPrice),
        total: Math.round(num(i.quantity) * num(i.unitPrice) * 100) / 100,
      })),
    }),
  };
}
