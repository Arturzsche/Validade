// Converte entidades do Prisma para o formato da API (Decimal -> number, DATE -> 'YYYY-MM-DD').
import { describeBatch } from '../domain/expiry.js';
import { toDateOnly } from './dates.js';

/** Versão da foto tirada no celular (null = sem foto). Vai na URL para invalidar cache. */
const photoVersion = (p) => (p.photoUpdatedAt ? new Date(p.photoUpdatedAt).getTime() : null);

const num = (d) => (d === null || d === undefined ? null : Number(d.toString()));

/**
 * O que o usuário pode ver. Operador (balcão/estoque) não vê custo nem dinheiro em risco:
 * esses números são do dono. Preço de venda continua visível (está na etiqueta da gôndola).
 */
export const viewFor = (user) => ({ financial: user?.role === 'OWNER' });
const OWNER_VIEW = { financial: true };

export function serializeProduct(p, { financial } = OWNER_VIEW) {
  const out = {
    id: p.id,
    barcode: p.barcode,
    name: p.name,
    brand: p.brand,
    category: p.category,
    imageUrl: p.imageUrl,
    photoVersion: photoVersion(p),
    price: num(p.price),
    costPrice: num(p.costPrice),
    ...(p._count && { activeBatches: p._count.batches }), // itens na prateleira (listagem do catálogo)
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
  if (!financial) delete out.costPrice;
  return out;
}

export function serializeBatch(batch, store, today, { financial } = OWNER_VIEW) {
  const { product, ...b } = batch;
  const out = {
    id: b.id,
    productId: b.productId,
    initialQuantity: b.initialQuantity,
    quantity: b.quantity,
    status: b.status,
    unitPrice: num(b.unitPrice),
    unitCost: num(b.unitCost),
    note: b.note,
    createdById: b.createdById,
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
    ...describeBatch(b, store, today), // expiryDate, daysToExpiry, semaphore, valueAtRisk...
    ...(product && {
      product: {
        id: product.id,
        barcode: product.barcode,
        name: product.name,
        brand: product.brand,
        imageUrl: product.imageUrl,
        category: product.category,
        photoVersion: photoVersion(product),
        ...(product.price !== undefined && { price: num(product.price) }),
      },
    }),
  };
  if (!financial) {
    delete out.unitCost;
    delete out.valueAtRisk;
    delete out.riskBasis;
  }
  return out;
}

export function serializeStore(s) {
  return {
    id: s.id,
    name: s.name,
    document: s.document,
    segment: s.segment,
    whatsappPhone: s.whatsappPhone,
    timezone: s.timezone,
    warningDays: s.warningDays,
    criticalDays: s.criticalDays,
    suggestedDiscountPct: s.suggestedDiscountPct,
  };
}

export function serializeDailyReport(r) {
  return {
    id: r.id,
    date: toDateOnly(r.date),
    channel: r.channel,
    status: r.status,
    recipient: r.recipient,
    message: r.message,
    error: r.error,
    attempts: r.attempts,
    itemsCount: r.itemsCount,
    valueAtRisk: num(r.valueAtRisk),
    sentAt: r.sentAt,
    createdAt: r.createdAt,
  };
}
