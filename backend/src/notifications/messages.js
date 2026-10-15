// Textos das notificações (formatação do WhatsApp: *negrito*, _itálico_).
import { fromCents } from '../domain/expiry.js';

const brl = (value) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/**
 * Relatório diário (uma mensagem por loja por dia). `risk.items` já vem do mais urgente ao menos.
 * Formatação do WhatsApp: *negrito*.
 */
const MAX_LINES = 5;
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const when = (d) => (d < 0 ? `venceu há ${plural(-d, 'dia', 'dias')}` : d === 0 ? 'vence *hoje*' : d === 1 ? 'vence amanhã' : `vence em ${d} dias`);

function lines(items) {
  const shown = items.slice(0, MAX_LINES).map((i) => `• ${i.name} (${i.quantity} un.) — ${when(i.daysToExpiry)}`);
  if (items.length > MAX_LINES) shown.push(`• … e mais ${plural(items.length - MAX_LINES, 'item', 'itens')}`);
  return shown;
}

export function buildDailyReport({ store, risk, appUrl }) {
  const header = `☀️ *Bom dia! Relatório iValida · ${store.name}*`;
  if (!risk.items.length) {
    return [header, '', 'Tudo em dia: nenhum produto perto de vencer hoje. ✅'].join('\n');
  }

  const expired = risk.items.filter((i) => i.daysToExpiry < 0);
  const promo = risk.items.filter((i) => i.daysToExpiry >= 0);
  const out = [
    header,
    '',
    `Você tem *${plural(risk.items.length, 'produto', 'produtos')}* a vencer${expired.length ? ' ou já vencidos' : ''}, somando *${brl(fromCents(risk.valueCents))}* em risco.`,
  ];
  if (promo.length) out.push('', `🏷️ *Para colocar em promoção (${promo.length}):*`, ...lines(promo));
  if (expired.length) out.push('', `⛔ *Já venceram — tirar da prateleira (${expired.length}):*`, ...lines(expired));
  out.push('', appUrl ? `👉 Crie as promoções no painel: ${appUrl.replace(/\/$/, '')}/painel` : '👉 Abra o painel do iValida para criar as promoções.');
  return out.join('\n').replace(/\u00a0/g, ' ');
}
