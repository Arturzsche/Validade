// Execução avulsa do job (npm run job:expiry) — útil em dev ou para agendar
// via cron externo (Supabase pg_cron, GitHub Actions, Render Cron Job...).
import { prisma } from '../lib/prisma.js';
import { executeExpiryCheck } from './expiryCheck.job.js';

try {
  const results = await executeExpiryCheck();
  console.table(results);
} catch (err) {
  console.error(err);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
