// Motor de alertas de vencimento — chamado pelo cron diário, pelo endpoint
// manual e logo após a entrada de um lote que já nasce na zona vermelha.
//
// Garantias:
//  - Idempotente: UNIQUE(batch_id, level) impede alerta duplicado, então o job
//    pode rodar quantas vezes for preciso (ou em mais de uma instância).
//  - Sem envio duplo: cada envio "reivindica" o alerta com um update condicional
//    em `attempts` (lock otimista) antes de chamar o notificador.
//  - Re-tentativa: alertas PENDING/FAILED são reenviados até ALERT_MAX_ATTEMPTS.

import { Prisma } from '@prisma/client';
import { env } from '../../config/env.js';
import { prisma } from '../../lib/prisma.js';
import { addDays, diffInDays, todayInTimeZone } from '../../lib/dates.js';
import { alertLevelFor, batchRiskCents, fromCents } from '../../domain/expiry.js';
import { buildAlertMessage } from '../../notifications/messages.js';
import { getNotifier } from '../../notifications/index.js';

const productSelect = { select: { id: true, name: true, barcode: true } };
const activeBatch = { status: 'ACTIVE', quantity: { gt: 0 } };

async function createAlert({ store, batch, level, today }) {
  const existing = await prisma.expiryAlert.findUnique({
    where: { batchId_level: { batchId: batch.id, level } },
    select: { id: true },
  });
  if (existing) return null; // caminho comum: já alertado em outro dia

  try {
    return await prisma.expiryAlert.create({
      data: {
        storeId: store.id,
        batchId: batch.id,
        level,
        channel: getNotifier().channel,
        recipient: store.whatsappPhone,
        message: buildAlertMessage({ level, batch, store, today }),
        quantityAtAlert: batch.quantity,
        valueAtRisk: fromCents(batchRiskCents(batch)),
      },
    });
  } catch (err) {
    // Corrida com outro processo criando o mesmo alerta no mesmo instante
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') return null;
    throw err;
  }
}

async function deliver(alert, store, today) {
  // Reivindica o envio: só um processo consegue incrementar a partir deste `attempts`
  const { count } = await prisma.expiryAlert.updateMany({
    where: { id: alert.id, attempts: alert.attempts, status: { in: ['PENDING', 'FAILED'] } },
    data: { attempts: { increment: 1 } },
  });
  if (!count) return 'skipped';

  // Re-gera o texto com dados de hoje (dias restantes/saldo podem ter mudado desde a criação)
  const message = buildAlertMessage({ level: alert.level, batch: alert.batch, store, today });
  const notifier = getNotifier();

  try {
    await notifier.send({ to: store.whatsappPhone, message });
    await prisma.expiryAlert.update({
      where: { id: alert.id },
      data: { status: 'SENT', sentAt: new Date(), error: null, message, channel: notifier.channel, recipient: store.whatsappPhone },
    });
    return 'sent';
  } catch (err) {
    await prisma.expiryAlert.update({
      where: { id: alert.id },
      data: { status: 'FAILED', error: String(err?.message ?? err).slice(0, 500), message },
    });
    return 'failed';
  }
}

async function deliverPending({ store, today, batchId }) {
  const pending = await prisma.expiryAlert.findMany({
    where: {
      storeId: store.id,
      ...(batchId && { batchId }),
      status: { in: ['PENDING', 'FAILED'] },
      attempts: { lt: env.ALERT_MAX_ATTEMPTS },
      batch: activeBatch, // lote vendido/descartado depois do alerta não precisa mais de aviso
    },
    include: { batch: { include: { product: productSelect } } },
    orderBy: { createdAt: 'asc' },
  });

  const stats = { sent: 0, failed: 0, skipped: 0 };
  for (const alert of pending) stats[await deliver(alert, store, today)] += 1;
  return stats;
}

/** Verifica uma loja: gera alertas novos para lotes na zona vermelha e envia pendentes. */
export async function checkStore(store, now = new Date()) {
  const today = todayInTimeZone(store.timezone, now);

  const atRisk = await prisma.batch.findMany({
    where: { storeId: store.id, ...activeBatch, expiryDate: { lt: addDays(today, store.criticalDays) } },
    include: { product: productSelect },
    orderBy: { expiryDate: 'asc' },
  });

  let created = 0;
  for (const batch of atRisk) {
    const level = alertLevelFor(diffInDays(today, batch.expiryDate), store);
    if (level && (await createAlert({ store, batch, level, today }))) created += 1;
  }

  const delivery = await deliverPending({ store, today });
  return { storeId: store.id, batchesAtRisk: atRisk.length, created, ...delivery };
}

/** Executa a verificação para todas as lojas (cron) ou só uma (endpoint manual). */
export async function runExpiryCheck({ storeId, now = new Date() } = {}) {
  const stores = await prisma.store.findMany({ where: storeId ? { id: storeId } : undefined });
  const results = [];
  for (const store of stores) {
    try {
      results.push(await checkStore(store, now));
    } catch (err) {
      // Falha em uma loja não pode impedir as demais
      console.error(`[alerts] falha ao verificar loja ${store.id}`, err);
      results.push({ storeId: store.id, error: String(err?.message ?? err) });
    }
  }
  return results;
}

/** Alerta imediato para um lote (ex: acabou de ser cadastrado já vencendo). */
export async function checkBatchNow(batchId, now = new Date()) {
  const batch = await prisma.batch.findUnique({
    where: { id: batchId },
    include: { product: productSelect, store: true },
  });
  if (!batch || batch.status !== 'ACTIVE' || batch.quantity <= 0) return null;

  const { store } = batch;
  const today = todayInTimeZone(store.timezone, now);
  const level = alertLevelFor(diffInDays(today, batch.expiryDate), store);
  if (!level) return null;

  await createAlert({ store, batch, level, today });
  return deliverPending({ store, today, batchId });
}
