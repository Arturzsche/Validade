import cron from 'node-cron';
import { env } from '../config/env.js';
import { runExpiryCheck } from '../modules/alerts/alerts.service.js';

export async function executeExpiryCheck() {
  const startedAt = Date.now();
  console.log('[cron] verificação de vencimentos iniciada');
  const results = await runExpiryCheck();
  const totals = results.reduce(
    (acc, r) => ({
      stores: acc.stores + 1,
      created: acc.created + (r.created ?? 0),
      sent: acc.sent + (r.sent ?? 0),
      failed: acc.failed + (r.failed ?? 0),
      errors: acc.errors + (r.error ? 1 : 0),
    }),
    { stores: 0, created: 0, sent: 0, failed: 0, errors: 0 },
  );
  console.log(`[cron] concluída em ${Date.now() - startedAt}ms`, totals);
  return results;
}

/**
 * Agenda o job diário. `noOverlap` evita que uma execução lenta se sobreponha à próxima;
 * a idempotência por UNIQUE(batch_id, level) cobre o caso de várias instâncias da API.
 */
export function scheduleExpiryCheck() {
  if (!cron.validate(env.CRON_SCHEDULE)) throw new Error(`CRON_SCHEDULE inválido: ${env.CRON_SCHEDULE}`);

  const task = cron.schedule(
    env.CRON_SCHEDULE,
    () => executeExpiryCheck().catch((err) => console.error('[cron] erro inesperado', err)),
    { timezone: env.CRON_TIMEZONE, name: 'expiry-check', noOverlap: true },
  );
  console.log(`[cron] expiry-check agendado: "${env.CRON_SCHEDULE}" (${env.CRON_TIMEZONE})`);
  return task;
}
