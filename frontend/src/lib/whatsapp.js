// Estado do canal WhatsApp -> nível visual do indicador do cabeçalho.

export const LEVELS = {
  connected: { label: 'Conectado', dot: 'bg-emerald-500', chip: 'bg-emerald-100 text-emerald-800 ring-emerald-200' },
  connecting: { label: 'Conectando…', dot: 'bg-amber-400', chip: 'bg-amber-100 text-amber-900 ring-amber-200' },
  disconnected: { label: 'Desconectado', dot: 'bg-rose-500', chip: 'bg-rose-100 text-rose-800 ring-rose-300' },
  simulated: { label: 'Simulação', dot: 'bg-stone-400', chip: 'bg-stone-100 text-stone-600 ring-stone-200' },
  unknown: { label: 'WhatsApp', dot: 'bg-stone-400', chip: 'bg-stone-100 text-stone-500 ring-stone-200' },
};

/**
 * open                        -> conectado
 * connecting / 1ª-2ª tentativa de reconexão -> conectando (quedas curtas se resolvem sozinhas)
 * aguardando QR, sessão substituída, parado, 3+ tentativas -> desconectado (precisa de ação)
 */
export function channelLevel(status) {
  if (!status) return 'unknown';
  if (status.provider === 'console') return 'simulated';
  if (status.state === 'open') return 'connected';
  if (status.state === 'connecting') return 'connecting';
  if (status.state === 'reconnecting' && (status.reconnectAttempts ?? 0) < 3) return 'connecting';
  return 'disconnected';
}

/** '5511900000000:7@s.whatsapp.net' -> '+55 11 90000-0000' */
export function formatJidPhone(jid) {
  const digits = String(jid ?? '').split(/[:@]/)[0];
  const m = digits.match(/^55(\d{2})(\d{4,5})(\d{4})$/);
  return m ? `+55 ${m[1]} ${m[2]}-${m[3]}` : digits ? `+${digits}` : null;
}

/** '(11) 99999-8888' -> '+5511999998888'; aceita também com 55 na frente. null se inválido. */
export function toE164BR(input) {
  const digits = String(input ?? '').replace(/\D/g, '');
  if (digits.length === 10 || digits.length === 11) return `+55${digits}`;
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55')) return `+${digits}`;
  return null;
}

/** '+5511999998888' -> '(11) 99999-8888' (para exibir no input) */
export function formatBRPhone(e164) {
  const m = String(e164 ?? '').match(/^\+55(\d{2})(\d{4,5})(\d{4})$/);
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : e164 ?? '';
}
