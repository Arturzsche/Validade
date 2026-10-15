// Textos das notificações (formatação do WhatsApp: *negrito*, _itálico_).
import { describeBatch, fromCents, promoPriceCents } from '../domain/expiry.js';

const brl = (value) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const brDate = (ymd) => ymd.split('-').reverse().join('/');

export function buildAlertMessage({ level, batch, store, today }) {
  const info = describeBatch(batch, store, today);
  const product = batch.product.name;
  const units = `${batch.quantity} un.`;

  if (level === 'EXPIRED') {
    return [
      `⛔ *iValida · ${store.name}*`,
      `*${product}* venceu em ${brDate(info.expiryDate)}.`,
      `Estoque: ${units} · Dinheiro perdido: *${brl(info.valueAtRisk)}*`,
      `👉 Retire da área de venda e registre a baixa no app.`,
    ].join('\n');
  }

  const when = info.daysToExpiry === 0 ? '*hoje*' : `em *${info.daysToExpiry} dia(s)* (${brDate(info.expiryDate)})`;
  const pct = store.suggestedDiscountPct;
  const price = brl(Number(batch.unitPrice.toString()));
  const promo = brl(fromCents(promoPriceCents(batch, pct)));

  return [
    `🔴 *iValida · ${store.name}*`,
    `*${product}* vence ${when}.`,
    `Estoque: ${units} · Dinheiro parado: *${brl(info.valueAtRisk)}*`,
    `💡 Sugestão: promoção de *${pct}% OFF* — de ${price} por *${promo}* para vender antes de vencer.`,
  ].join('\n');
}
