// Datas para exibição (pt-BR).

const DAY_MS = 24 * 60 * 60 * 1000;

/** 'YYYY-MM-DD' -> 'DD/MM/AAAA' */
export const formatDateBR = (iso) => iso.split('-').reverse().join('/');

/** "hoje", "ontem", "há 3 dias" ou a data (para mais de uma semana). */
export function relativeDay(dateLike, now = new Date()) {
  const date = new Date(dateLike);
  const startOf = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOf(now) - startOf(date)) / DAY_MS);
  if (days <= 0) return 'hoje';
  if (days === 1) return 'ontem';
  if (days < 7) return `há ${days} dias`;
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
}
