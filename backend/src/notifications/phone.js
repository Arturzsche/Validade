/** '+55 (11) 99999-8888' -> '5511999998888' (formato aceito pelo WhatsApp, sem '+') */
export function toWhatsAppNumber(phone) {
  const digits = String(phone ?? '').replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 15 ? digits : null;
}
