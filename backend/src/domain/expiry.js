// Regras de negócio puras do semáforo de validade (sem I/O — fáceis de testar).

import { addDays, diffInDays, toDateOnly } from '../lib/dates.js';

export const Semaphore = Object.freeze({
  GREEN: 'green',
  YELLOW: 'yellow',
  RED: 'red',
});

/**
 * Cor do lote a partir dos dias restantes:
 *   vermelho: d <  criticalDays (inclui vencidos)
 *   amarelo:  criticalDays <= d <= warningDays
 *   verde:    d >  warningDays
 */
export function classify(daysToExpiry, { warningDays, criticalDays }) {
  if (daysToExpiry < criticalDays) return Semaphore.RED;
  if (daysToExpiry <= warningDays) return Semaphore.YELLOW;
  return Semaphore.GREEN;
}

/**
 * Faixas de `expiryDate` equivalentes a cada cor, para filtrar direto no banco.
 * Retorna um filtro Prisma para o campo expiryDate.
 */
export function expiryDateFilterFor(color, today, { warningDays, criticalDays }) {
  const redUntil = addDays(today, criticalDays); // exclusivo
  const yellowUntil = addDays(today, warningDays); // inclusivo
  switch (color) {
    case Semaphore.RED:
      return { lt: redUntil };
    case Semaphore.YELLOW:
      return { gte: redUntil, lte: yellowUntil };
    case Semaphore.GREEN:
      return { gt: yellowUntil };
    case 'expired':
      return { lt: today };
    default:
      throw new RangeError(`Cor desconhecida: ${color}`);
  }
}

/** Nível de alerta que o cron deve gerar (null = sem alerta). */
export function alertLevelFor(daysToExpiry, { criticalDays }) {
  if (daysToExpiry < 0) return 'EXPIRED';
  if (daysToExpiry < criticalDays) return 'CRITICAL';
  return null;
}

// ---------------------------------------------------------------------------
// Dinheiro: trabalhamos em centavos (inteiros) para não acumular erro de float.
// ---------------------------------------------------------------------------

/** Prisma.Decimal | string | number -> centavos */
export function toCents(value) {
  if (value === null || value === undefined) return null;
  return Math.round(Number(value.toString()) * 100);
}

export const fromCents = (cents) => cents / 100;

/**
 * Base do valor em risco: custo unitário; se não houver custo cadastrado,
 * cai para o preço de venda (decisão do produto: a "dor" é o dinheiro que saiu do caixa).
 */
export function riskUnitCents(batch) {
  const cost = toCents(batch.unitCost);
  return cost ?? toCents(batch.unitPrice);
}

export function riskBasis(batch) {
  return batch.unitCost === null || batch.unitCost === undefined ? 'price' : 'cost';
}

export function batchRiskCents(batch) {
  return batch.quantity * riskUnitCents(batch);
}

/** Enriquecer um lote com os campos derivados usados pela API/dashboard. */
export function describeBatch(batch, store, today) {
  const daysToExpiry = diffInDays(today, batch.expiryDate);
  return {
    daysToExpiry,
    expired: daysToExpiry < 0,
    semaphore: classify(daysToExpiry, store),
    riskBasis: riskBasis(batch),
    valueAtRisk: fromCents(batchRiskCents(batch)),
    expiryDate: toDateOnly(batch.expiryDate),
  };
}

/** Preço promocional sugerido a partir do preço de venda e do desconto da loja. */
export function promoPriceCents(batch, discountPct) {
  const price = toCents(batch.unitPrice);
  return Math.round((price * (100 - discountPct)) / 100);
}
