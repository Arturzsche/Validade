import { env } from './config/env.js';
import { prisma } from './lib/prisma.js';
import { createApp } from './app.js';
import { scheduleExpiryCheck } from './jobs/expiryCheck.job.js';

const app = createApp();
const server = app.listen(env.PORT, () => {
  console.log(`🚀 Validade API ouvindo em http://localhost:${env.PORT}`);
});

const cronTask = env.CRON_ENABLED ? scheduleExpiryCheck() : null;

async function shutdown(signal) {
  console.log(`\n${signal} recebido, encerrando...`);
  cronTask?.stop();
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
