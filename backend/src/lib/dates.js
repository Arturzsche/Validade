// Datas "date-only" (coluna DATE, ex: validade do orçamento) são sempre Date em meia-noite UTC.

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

export function addDays(date, days) {
  return new Date(date.getTime() + days * DAY_MS);
}

/** Primeiro instante do mês corrente no fuso informado (para "Aprovados no Mês"). */
export function startOfMonthInTimeZone(timeZone, now = new Date()) {
  const [year, month] = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit' })
    .format(now)
    .split('-')
    .map(Number);
  // Meia-noite local do dia 1: ajusta pelo deslocamento do fuso naquele instante
  const utcGuess = Date.UTC(year, month - 1, 1);
  const local = new Date(new Date(utcGuess).toLocaleString('en-US', { timeZone }));
  const utc = new Date(new Date(utcGuess).toLocaleString('en-US', { timeZone: 'UTC' }));
  return new Date(utcGuess - (local.getTime() - utc.getTime()));
}
