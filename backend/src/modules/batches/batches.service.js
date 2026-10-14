import { prisma } from '../../lib/prisma.js';
import { notFound, unprocessable } from '../../lib/httpError.js';
import { diffInDays, todayInTimeZone } from '../../lib/dates.js';
import { alertLevelFor, expiryDateFilterFor } from '../../domain/expiry.js';
import { checkBatchNow } from '../alerts/alerts.service.js';

const withProduct = { product: { select: { id: true, barcode: true, name: true, brand: true, imageUrl: true } } };

export async function getStoreContext(storeId) {
  const store = await prisma.store.findUniqueOrThrow({ where: { id: storeId } });
  return { store, today: todayInTimeZone(store.timezone) };
}

/**
 * Entrada rápida: o operador lê o código de barras e informa validade + quantidade.
 * - Produto desconhecido: cria se `product` vier no corpo; senão 422 PRODUCT_NOT_FOUND
 *   (o front então abre o mini-cadastro).
 * - Já existe lote ATIVO do mesmo produto com a mesma validade: soma a quantidade
 *   em vez de duplicar (o operador costuma bipar caixa por caixa).
 */
export async function quickEntry({ storeId, userId, input }) {
  const { barcode, expiryDate, quantity, note, product: productData } = input;

  const result = await prisma.$transaction(async (tx) => {
    let product = await tx.product.findUnique({ where: { storeId_barcode: { storeId, barcode } } });
    let productCreated = false;

    if (!product) {
      if (!productData) {
        throw unprocessable('PRODUCT_NOT_FOUND', 'Produto não cadastrado. Envie `product` com nome e preço.', { barcode });
      }
      product = await tx.product.create({ data: { ...productData, barcode, storeId } });
      productCreated = true;
    }

    const existing = await tx.batch.findFirst({
      where: { storeId, productId: product.id, expiryDate, status: 'ACTIVE' },
    });

    if (existing) {
      const batch = await tx.batch.update({
        where: { id: existing.id },
        data: { quantity: { increment: quantity }, initialQuantity: { increment: quantity } },
        include: withProduct,
      });
      return { batch, merged: true, productCreated };
    }

    const batch = await tx.batch.create({
      data: {
        storeId,
        productId: product.id,
        createdById: userId,
        expiryDate,
        quantity,
        initialQuantity: quantity,
        unitPrice: product.price, // snapshots: mudanças futuras no produto não alteram o histórico
        unitCost: product.costPrice,
        note,
      },
      include: withProduct,
    });
    return { batch, merged: false, productCreated };
  });

  return result;
}

/** Se o lote já entrou na zona vermelha, alerta na hora (sem esperar o cron do dia seguinte). */
export function triggerImmediateAlertIfNeeded(batch, store, today) {
  const level = alertLevelFor(diffInDays(today, batch.expiryDate), store);
  if (!level) return;
  checkBatchNow(batch.id).catch((err) => console.error('[alerts] falha no alerta imediato', err));
}

export async function listBatches({ storeId, store, today, filters }) {
  const { semaphore, status, productId, search, page, pageSize } = filters;

  const where = {
    storeId,
    status,
    ...(status === 'ACTIVE' && { quantity: { gt: 0 } }),
    ...(productId && { productId }),
    ...(semaphore && { expiryDate: expiryDateFilterFor(semaphore, today, store) }),
    ...(search && {
      product: { OR: [{ name: { contains: search, mode: 'insensitive' } }, { barcode: { startsWith: search } }] },
    }),
  };

  const [items, total] = await prisma.$transaction([
    prisma.batch.findMany({
      where,
      include: withProduct,
      orderBy: [{ expiryDate: 'asc' }, { createdAt: 'asc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.batch.count({ where }),
  ]);
  return { items, total };
}

export async function findOwnBatch(storeId, id) {
  const batch = await prisma.batch.findFirst({ where: { id, storeId }, include: withProduct });
  if (!batch) throw notFound('Lote não encontrado');
  return batch;
}

export async function updateBatch({ storeId, id, data }) {
  const current = await findOwnBatch(storeId, id);
  const patch = { ...data };

  // Baixa total encerra o lote automaticamente; repor saldo reativa um lote vendido
  if (patch.quantity === 0 && !patch.status) patch.status = 'SOLD_OUT';
  if (patch.quantity > 0 && current.status === 'SOLD_OUT' && !patch.status) patch.status = 'ACTIVE';

  return prisma.batch.update({ where: { id: current.id }, data: patch, include: withProduct });
}

export async function deleteBatch({ storeId, id }) {
  const current = await findOwnBatch(storeId, id);
  await prisma.batch.delete({ where: { id: current.id } });
}
