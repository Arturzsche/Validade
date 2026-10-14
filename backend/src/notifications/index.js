// Ponto único de notificação. A regra de negócio (cron/alertas) só conhece esta
// interface — trocar Baileys por Z-API, Evolution API ou a API oficial da Meta é
// escrever um novo provider e registrá-lo abaixo, sem tocar no motor de alertas.
//
// Contrato de um provider:
//   name: string                     identificador ('console', 'whatsapp', ...)
//   channel: 'CONSOLE' | 'WHATSAPP'  gravado no histórico (expiry_alerts.channel)
//   start(), stop(): Promise<void>   ciclo de vida (conexão, sessão)
//   isReady(): boolean               pode enviar agora?
//   onReady(fn): () => void          chamado a cada (re)conexão
//   status(): object                 diagnóstico para a API
//   getQr(): { qr, generatedAt }|null pareamento pendente (null se o provider não usa QR)
//   restart(): Promise<void>         força reconexão imediata (botão no painel)
//   send({ to, message }): Promise<{ id }>
//     lança NotifierUnavailableError (transitório) ou RecipientError (destinatário)

import { env } from '../config/env.js';
import { createConsoleProvider } from './providers/console.provider.js';

const factories = {
  console: async () => createConsoleProvider(),
  whatsapp: async () => {
    // Import dinâmico: Baileys só é carregado quando de fato usado
    const { createBaileysProvider } = await import('./providers/baileys.provider.js');
    return createBaileysProvider({
      authDir: env.WHATSAPP_AUTH_DIR,
      sendIntervalMs: env.WHATSAPP_SEND_INTERVAL_MS,
      logLevel: env.WHATSAPP_LOG_LEVEL,
    });
  },
};

let current = createConsoleProvider();

export const getNotifier = () => current;

/** Cria e inicia o provider configurado em NOTIFIER. */
export async function startNotifier(name = env.NOTIFIER) {
  const factory = factories[name];
  if (!factory) throw new Error(`NOTIFIER desconhecido: ${name}`);
  current = await factory();
  await current.start();
  console.log(`[notificações] canal ativo: ${current.name}`);
  return current;
}

export async function stopNotifier() {
  await current.stop();
}

/** Permite trocar o canal em testes. */
export function setNotifier(notifier) {
  current = notifier;
}
