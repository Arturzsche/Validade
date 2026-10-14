// Execução avulsa do job (npm run job:expiry) — útil em dev.
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import { executeExpiryCheck } from './expiryCheck.job.js';

if (env.NOTIFIER === 'whatsapp') {
  // Uma sessão do WhatsApp só pode estar aberta em um processo: abrir aqui derrubaria
  // a do servidor. Com o servidor no ar, dispare pela API (mesma rotina do cron):
  console.error(
    'Com NOTIFIER=whatsapp, rode a verificação pelo servidor que mantém a sessão:\n' +
      '  curl -X POST http://localhost:3333/api/alerts/run -H "Authorization: Bearer <token-do-dono>"',
  );
  process.exit(1);
}

try {
  const results = await executeExpiryCheck();
  console.table(results);
} catch (err) {
  console.error(err);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
