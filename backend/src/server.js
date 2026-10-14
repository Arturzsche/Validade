import { env } from './config/env.js';
import { prisma } from './lib/prisma.js';
import { createApp } from './app.js';
import { scheduleExpiryCheck } from './jobs/expiryCheck.job.js';
import { startNotifier, stopNotifier } from './notifications/index.js';
import { flushPendingAlerts } from './modules/alerts/alerts.service.js';

const app = createApp();
const server = app.listen(env.PORT, () => {
  console.log(`🚀 Validade API ouvindo em http://localhost:${env.PORT}`);
});

// Canal de notificação (NOTIFIER=whatsapp imprime o QR aqui no terminal na 1ª vez)
const notifier = await startNotifier();

// A cada (re)conexão, envia o que o cron gerou enquanto o canal estava fora do ar
notifier.onReady(async () => {
  const results = await flushPendingAlerts();
  const sent = results.reduce((n, r) => n + (r.sent ?? 0), 0);
  if (sent) console.log(`[alerts] ${sent} alerta(s) pendente(s) enviado(s) após reconexão`);
});

const cronTask = env.CRON_ENABLED ? scheduleExpiryCheck() : null;

async function shutdown(signal) {
  console.log(`\n${signal} recebido, encerrando...`);
  cronTask?.stop();
  await stopNotifier().catch(() => {});
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
