// Datas de validade são "date-only" (coluna DATE). Representamos sempre como
// Date em meia-noite UTC, e o "hoje" é calculado no fuso da loja — assim um
// lote que vence amanhã não "pula" de dia por causa do fuso do servidor.

export const DAY_MS = 24 * 60 * 60 * 1000;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** 'YYYY-MM-DD' -> Date (meia-noite UTC). Lança se a data não existir (ex: 2026-02-30). */
export function parseDateOnly(value) {
  if (!ISO_DATE.test(value)) throw new RangeError(`Data inválida: ${value}`);
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || toDateOnly(date) !== value) {
    throw new RangeError(`Data inválida: ${value}`);
  }
  return date;
}

/** Date -> 'YYYY-MM-DD' */
export function toDateOnly(date) {
  return date.toISOString().slice(0, 10);
}

/** Data de hoje no fuso informado, como Date em meia-noite UTC. */
export function todayInTimeZone(timeZone, now = new Date()) {
  const ymd = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  return parseDateOnly(ymd);
}

export function addDays(date, days) {
  return new Date(date.getTime() + days * DAY_MS);
}

/** Diferença em dias inteiros entre duas datas date-only. */
export function diffInDays(from, to) {
  return Math.round((to.getTime() - from.getTime()) / DAY_MS);
}
