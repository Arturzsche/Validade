import { env } from './config/env.js';
import { prisma } from './lib/prisma.js';
import { createApp } from './app.js';
import { startNotifier, stopNotifier } from './notifications/index.js';

const app = createApp();
const server = app.listen(env.PORT, () => {
  console.log(`🚀 API de Orçamentos ouvindo em http://localhost:${env.PORT}`);
});

// WhatsApp (NOTIFIER=whatsapp): mantém a sessão ativa e o QR disponível no painel.
// Por enquanto o bot é silencioso: nenhum envio automático está ligado.
await startNotifier();
if (env.NOTIFIER === 'whatsapp' && !env.WHATSAPP_ADMIN_EMAILS.length) {
  console.warn('[whatsapp] ⚠️ WHATSAPP_ADMIN_EMAILS vazio: o QR só aparece neste terminal.');
}

async function shutdown(signal) {
  console.log(`\n${signal} recebido, encerrando...`);
  await stopNotifier().catch(() => {});
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
