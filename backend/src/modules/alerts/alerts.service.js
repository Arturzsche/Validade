// Relatório diário de vencimentos — chamado pelo cron (de manhã), pelo endpoint manual e
// a cada (re)conexão do WhatsApp. Em vez de uma mensagem por produto (que vira spam e faz o
// lojista ignorar o canal), envia UMA mensagem por loja por dia com o resumo e os itens.
//
// Garantias:
//  - Idempotente: UNIQUE(store_id, date) — o cron pode rodar quantas vezes for preciso
//    (ou em mais de uma instância) sem duplicar o relatório.
//  - Sem envio duplo: o envio "reivindica" o relatório com update condicional em `attempts`.
//  - Canal fora do ar (ex: WhatsApp desconectado) não consome tentativa: o relatório fica
//    pendente e sai em flushPendingAlerts() quando a conexão volta — só no mesmo dia.
//  - O texto é montado NA HORA DO ENVIO, com os números atuais.

import { Prisma } from '@prisma/client';
import { env } from '../../config/env.js';
import { prisma } from '../../lib/prisma.js';
import { addDays, diffInDays, todayInTimeZone } from '../../lib/dates.js';
import { batchRiskCents, fromCents } from '../../domain/expiry.js';
import { buildDailyReport } from '../../notifications/messages.js';
import { getNotifier } from '../../notifications/index.js';
import { NotifierUnavailableError } from '../../notifications/errors.js';

/** Produtos na prateleira que vencem antes de `criticalDays` (inclui vencidos), do mais urgente ao menos. */
export async function collectRisk(store, today) {
  const batches = await prisma.batch.findMany({
    where: {
      storeId: store.id,
      status: 'ACTIVE',
      quantity: { gt: 0 },
      expiryDate: { lt: addDays(today, store.criticalDays) },
    },
    include: { product: { select: { name: true } } },
    orderBy: { expiryDate: 'asc' },
  });
  const items = batches.map((b) => ({
    name: b.product.name,
    quantity: b.quantity,
    daysToExpiry: diffInDays(today, b.expiryDate),
    valueCents: batchRiskCents(b),
  }));
  return { items, valueCents: items.reduce((sum, i) => sum + i.valueCents, 0) };
}

async function createReport(store, today, risk) {
  try {
    return await prisma.dailyReport.create({
      data: {
        storeId: store.id,
        date: today,
        channel: getNotifier().channel,
        recipient: store.whatsappPhone,
        itemsCount: risk.items.length,
        valueAtRisk: fromCents(risk.valueCents),
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') return null; // já existe hoje
    throw err;
  }
}

async function deliver(report, store, today) {
  // Reivindica o envio: só um processo consegue incrementar a partir deste `attempts`
  const { count } = await prisma.dailyReport.updateMany({
    where: { id: report.id, attempts: report.attempts, status: { in: ['PENDING', 'FAILED'] } },
    data: { attempts: { increment: 1 } },
  });
  if (!count) return 'skipped';

  const risk = await collectRisk(store, today);
  const message = buildDailyReport({ store, risk, appUrl: env.PUBLIC_APP_URL });
  const notifier = getNotifier();
  const summary = { itemsCount: risk.items.length, valueAtRisk: fromCents(risk.valueCents), message };

  try {
    await notifier.send({ to: store.whatsappPhone, message });
    await prisma.dailyReport.update({
      where: { id: report.id },
      data: { ...summary, status: 'SENT', sentAt: new Date(), error: null, channel: notifier.channel, recipient: store.whatsappPhone },
    });
    return 'sent';
  } catch (err) {
    if (err instanceof NotifierUnavailableError) {
      // Não é culpa do relatório: devolve a tentativa e mantém o status como estava
      await prisma.dailyReport.update({
        where: { id: report.id },
        data: { attempts: { decrement: 1 }, error: err.message.slice(0, 500) },
      });
      return 'waiting';
    }
    await prisma.dailyReport.update({
      where: { id: report.id },
      data: { ...summary, status: 'FAILED', error: String(err?.message ?? err).slice(0, 500) },
    });
    return 'failed';
  }
}

/** Envia o relatório pendente de HOJE (um relatório de ontem não sai mais como "bom dia"). */
async function deliverPending(store, today) {
  const stats = { sent: 0, failed: 0, skipped: 0, waiting: 0 };
  const pending = await prisma.dailyReport.findMany({
    where: { storeId: store.id, date: today, status: { in: ['PENDING', 'FAILED'] }, attempts: { lt: env.ALERT_MAX_ATTEMPTS } },
  });
  if (!pending.length) return stats;

  if (!getNotifier().isReady()) {
    stats.waiting = pending.length; // canal offline: nada é marcado como falha; envia quando reconectar
    return stats;
  }
  for (const report of pending) stats[await deliver(report, store, today)] += 1;
  return stats;
}

/** Verifica uma loja: cria o relatório do dia (se houver algo em risco) e envia. */
export async function checkStore(store, now = new Date()) {
  const today = todayInTimeZone(store.timezone, now);
  const risk = await collectRisk(store, today);
  const created = risk.items.length ? Boolean(await createReport(store, today, risk)) : false;
  const delivery = await deliverPending(store, today);
  return { storeId: store.id, itemsAtRisk: risk.items.length, created: created ? 1 : 0, ...delivery };
}

/** Executa para todas as lojas (cron) ou só uma (endpoint manual). */
export async function runExpiryCheck({ storeId, now = new Date() } = {}) {
  const stores = await prisma.store.findMany({ where: storeId ? { id: storeId } : undefined });
  const results = [];
  for (const store of stores) {
    try {
      results.push(await checkStore(store, now));
    } catch (err) {
      // Falha em uma loja não pode impedir as demais
      console.error(`[relatório] falha ao verificar loja ${store.id}`, err);
      results.push({ storeId: store.id, error: String(err?.message ?? err) });
    }
  }
  return results;
}

/** Reenvia hoje o relatório de uma loja (botão de teste do dono). */
export async function resendTodayReport(storeId, now = new Date()) {
  const store = await prisma.store.findUniqueOrThrow({ where: { id: storeId } });
  const today = todayInTimeZone(store.timezone, now);
  await prisma.dailyReport.deleteMany({ where: { storeId, date: today } });
  return checkStore(store, now);
}

/** Envia os relatórios de hoje que ficaram pendentes enquanto o canal estava fora do ar. */
export async function flushPendingAlerts(now = new Date()) {
  const stores = await prisma.store.findMany({
    where: { reports: { some: { status: { in: ['PENDING', 'FAILED'] }, attempts: { lt: env.ALERT_MAX_ATTEMPTS } } } },
  });
  const results = [];
  for (const store of stores) {
    try {
      results.push({ storeId: store.id, ...(await deliverPending(store, todayInTimeZone(store.timezone, now))) });
    } catch (err) {
      console.error(`[relatório] falha ao reenviar pendentes da loja ${store.id}`, err);
      results.push({ storeId: store.id, error: String(err?.message ?? err) });
    }
  }
  return results;
}
