import 'dotenv/config';
import { z } from 'zod';

const bool = z
  .enum(['true', 'false', '1', '0'])
  .transform((v) => v === 'true' || v === '1');

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3333),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL é obrigatória'),
  CORS_ORIGIN: z.string().default('*'),

  JWT_SECRET: z.string().min(16, 'JWT_SECRET precisa ter ao menos 16 caracteres'),
  JWT_EXPIRES_IN: z.string().default('7d'),

  // Job diário de vencimentos
  CRON_ENABLED: bool.default(true),
  CRON_SCHEDULE: z.string().default('0 8 * * *'), // todo dia às 08:00
  CRON_TIMEZONE: z.string().default('America/Sao_Paulo'),

  // Notificações (Passo 4 adiciona "whatsapp")
  NOTIFIER: z.enum(['console']).default('console'),
  ALERT_MAX_ATTEMPTS: z.coerce.number().int().positive().default(3),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Variáveis de ambiente inválidas:');
  for (const issue of parsed.error.issues) {
    console.error(`   - ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = parsed.data;
