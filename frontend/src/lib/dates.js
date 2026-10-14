// Datas de validade digitadas no padrão brasileiro, com atalho para embalagens
// que trazem só mês/ano ("VAL 10/2026" -> último dia do mês).
//
// Interpretação pelos dígitos digitados:
//   8 dígitos  DDMMAAAA -> 15/10/2026
//   6 dígitos  MM20AA   -> 10/2026 (mês/ano; "20" nunca é um mês válido, então não há ambiguidade)
//   6 dígitos  DDMMAA   -> 15/10/26

const pad = (n) => String(n).padStart(2, '0');
const toIso = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
const lastDayOfMonth = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();
const isMonthYear = (digits) => digits.length === 6 && digits.slice(2, 4) === '20';

/** Máscara progressiva: 1510 -> 15/10 · 15102026 -> 15/10/2026 · 102026 -> 10/2026 */
export function maskDate(raw) {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (isMonthYear(digits)) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

/** Retorna { iso, monthOnly } ou { error }. */
export function parseExpiry(text) {
  const digits = text.replace(/\D/g, '');

  if (isMonthYear(digits)) {
    const mo = Number(digits.slice(0, 2));
    const y = Number(digits.slice(2));
    if (mo < 1 || mo > 12) return { error: 'Mês inválido' };
    return { iso: toIso(y, mo, lastDayOfMonth(y, mo)), monthOnly: true };
  }

  if (digits.length === 6 || digits.length === 8) {
    const d = Number(digits.slice(0, 2));
    const mo = Number(digits.slice(2, 4));
    const y = digits.length === 6 ? 2000 + Number(digits.slice(4)) : Number(digits.slice(4));
    if (mo < 1 || mo > 12 || d < 1 || d > lastDayOfMonth(y, mo)) return { error: 'Data inexistente' };
    return { iso: toIso(y, mo, d), monthOnly: false };
  }

  return { error: 'Use DD/MM/AAAA ou MM/AAAA' };
}

/** Hoje no fuso do aparelho, como 'YYYY-MM-DD'. */
export function todayIso(now = new Date()) {
  return toIso(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

export function daysBetween(fromIso, toIsoDate) {
  return Math.round((Date.parse(`${toIsoDate}T00:00:00Z`) - Date.parse(`${fromIso}T00:00:00Z`)) / 86_400_000);
}

export const formatDateBR = (iso) => iso.split('-').reverse().join('/');

/** Mesma regra do backend (domain/expiry.js). */
export function semaphoreFor(days, { warningDays = 30, criticalDays = 15 } = {}) {
  if (days < criticalDays) return 'red';
  if (days <= warningDays) return 'yellow';
  return 'green';
}
