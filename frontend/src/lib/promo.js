// Promoção de queima de estoque: matemática em centavos + texto pronto para o WhatsApp
// (*negrito*, ~riscado~ são a formatação nativa do WhatsApp).
import { brl } from './money.js';
import { formatDateBR } from './dates.js';

export const DISCOUNT_OPTIONS = [20, 30, 40, 50];

const toCents = (reais) => Math.round(reais * 100);

/**
 * Números da promoção para um lote.
 * - price: preço de venda ATUAL do produto (cai para o snapshot do lote)
 * - recovered: quanto entra no caixa vendendo todo o saldo na promoção
 * - loss: prejuízo potencial se nada for vendido (custo × saldo, vem da API)
 */
export function promoNumbers(batch, discountPct) {
  const priceCents = toCents(batch.product.price ?? batch.unitPrice);
  const promoCents = Math.round((priceCents * (100 - discountPct)) / 100);
  const unitCostCents = toCents(batch.unitCost ?? batch.unitPrice);
  return {
    price: priceCents / 100,
    promoPrice: promoCents / 100,
    recovered: (promoCents * batch.quantity) / 100,
    loss: batch.valueAtRisk,
    belowCost: promoCents < unitCostCents,
  };
}

export function buildPromoText({ batch, storeName, discountPct }) {
  const { price, promoPrice } = promoNumbers(batch, discountPct);
  const { product, quantity, expiryDate } = batch;
  const name = product.brand && !product.name.toLowerCase().includes(product.brand.toLowerCase())
    ? `${product.name} ${product.brand}`
    : product.name;

  return [
    `🔥 *OFERTA RELÂMPAGO* 🔥`,
    ``,
    `*${name}*`,
    `De ~${brl(price)}~ por apenas *${brl(promoPrice)}* (${discountPct}% OFF)`,
    ``,
    `📅 Validade: ${formatDateBR(expiryDate)}`,
    `📦 Só ${quantity} ${quantity === 1 ? 'unidade' : 'unidades'}, enquanto durar o estoque!`,
    ``,
    `📍 ${storeName}`,
  ]
    .join('\n')
    .replace(/\u00a0/g, ' '); // Intl usa espaço não separável em "R$ 4,99": normaliza para colar em qualquer app
}
