// Converte entidades do Prisma para o formato da API (Decimal -> number, DATE -> 'YYYY-MM-DD').
import { describeBatch } from '../domain/expiry.js';

/** Versão da foto tirada no celular (null = sem foto). Vai na URL para invalidar cache. */
const photoVersion = (p) => (p.photoUpdatedAt ? new Date(p.photoUpdatedAt).getTime() : null);

const num = (d) => (d === null || d === undefined ? null : Number(d.toString()));

export function serializeProduct(p) {
  return {
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
}

export function serializeBatch(batch, store, today) {
  const { product, ...b } = batch;
  return {
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

export function serializeAlert(a) {
  return {
    id: a.id,
    batchId: a.batchId,
    level: a.level,
    channel: a.channel,
    status: a.status,
    recipient: a.recipient,
    message: a.message,
    error: a.error,
    attempts: a.attempts,
    quantityAtAlert: a.quantityAtAlert,
    valueAtRisk: num(a.valueAtRisk),
    sentAt: a.sentAt,
    createdAt: a.createdAt,
  };
}
