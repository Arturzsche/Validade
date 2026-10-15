// Status do orçamento: rótulo em português + estilo do selo. Sem vermelho de alerta:
// rejeitado é neutro (cinza), aprovado é verde discreto, pendente é âmbar discreto.
export const QUOTE_STATUS = {
  PENDING: { label: 'Pendente', chip: 'bg-amber-50 text-amber-800 ring-amber-200', dot: 'bg-amber-500' },
  APPROVED: { label: 'Aprovado', chip: 'bg-emerald-50 text-emerald-800 ring-emerald-200', dot: 'bg-emerald-500' },
  REJECTED: { label: 'Rejeitado', chip: 'bg-slate-100 text-slate-600 ring-slate-200', dot: 'bg-slate-400' },
};

/** 0.666… -> "67%" */
export const formatRate = (rate) => (rate === null ? '—' : `${Math.round(rate * 100)}%`);

export const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

/** Número curto e legível do orçamento (derivado do id), ex: "#3F9A2C1B". */
export const quoteNumber = (id) => `#${id.replace(/-/g, '').slice(0, 8).toUpperCase()}`;

/** "2,5" / "2.5" / "1.234,5" -> número · vazio ou inválido -> null */
export function parseQuantity(text) {
  const raw = String(text).trim();
  if (!raw) return null;
  // Com vírgula, ela é o decimal (pt-BR) e pontos são milhar; sem vírgula, vale o ponto decimal
  const n = Number(raw.includes(',') ? raw.replace(/\./g, '').replace(',', '.') : raw);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}

/** Subtotal de um item em centavos (quantidade pode ser fracionária). */
export const itemTotalCents = (quantity, unitPriceCents) => Math.round((quantity ?? 0) * (unitPriceCents ?? 0));

/** Data local 'YYYY-MM-DD' daqui a `days` dias (padrão de validade da proposta). */
export function isoDateIn(days, now = new Date()) {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Mensagem que o prestador envia pelo próprio WhatsApp (*negrito* é a formatação do WhatsApp).
 * O PDF é gerado no aparelho, então a mensagem avisa que ele segue na conversa.
 */
export function buildShareMessage(quote, provider, formatMoney) {
  const firstName = quote.client.name.trim().split(/\s+/)[0];
  const total = formatMoney(quote.totalAmount).replace(/ /g, ' ');
  const pdfLine = quote.pixKey
    ? 'Na sequência te envio o PDF com todos os detalhes da proposta e a chave PIX para a entrada.'
    : 'Na sequência te envio o PDF com todos os detalhes da proposta.';
  return [
    `Olá *${firstName}*! Aqui é ${provider.name}. Segue o seu orçamento detalhado no valor de *${total}*.`,
    '',
    pdfLine,
    '',
    'Qualquer dúvida, é só me chamar por aqui. 🙂',
  ].join('\n');
}

/** Link oficial de compartilhamento (abre o app no celular ou o WhatsApp Web no computador). */
export function whatsappShareUrl(phoneE164, text) {
  // encodeURIComponent (espaço = %20): com "+" alguns clientes do WhatsApp mostram o sinal literal
  const digits = (phoneE164 ?? '').replace(/\D/g, '');
  const phone = digits ? `phone=${digits}&` : ''; // sem telefone: o WhatsApp pede para escolher o contato
  return `https://api.whatsapp.com/send?${phone}text=${encodeURIComponent(text)}`;
}
