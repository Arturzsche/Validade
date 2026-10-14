// Ponto único de envio. Hoje só existe o canal CONSOLE (simulação);
// o Passo 4 pluga aqui o provedor de WhatsApp com a mesma interface:
//   { channel: 'CONSOLE' | 'WHATSAPP', send({ to, message }) => Promise<void> }
import { env } from '../config/env.js';

const consoleNotifier = {
  channel: 'CONSOLE',
  async send({ to, message }) {
    console.log(`\n📲 [simulação WhatsApp] para ${to ?? '(loja sem número cadastrado)'}\n${message}\n`);
  },
};

const notifiers = { console: consoleNotifier };

let current = notifiers[env.NOTIFIER];

export const getNotifier = () => current;

/** Permite trocar o canal em testes. */
export function setNotifier(notifier) {
  current = notifier;
}
