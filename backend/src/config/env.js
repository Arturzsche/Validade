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
  // Fuso usado nos números do Dashboard ("Aprovados no Mês")
  APP_TIMEZONE: z.string().default('America/Sao_Paulo'),

  JWT_SECRET: z.string().min(16, 'JWT_SECRET precisa ter ao menos 16 caracteres'),
  JWT_EXPIRES_IN: z.string().default('7d'),


  // Notificações: console (simulação) | whatsapp (Baileys, QR no terminal)
  NOTIFIER: z.enum(['console', 'whatsapp']).default('console'),
  WHATSAPP_AUTH_DIR: z.string().default('.wa-session'), // credenciais da sessão (NUNCA versionar)
  WHATSAPP_SEND_INTERVAL_MS: z.coerce.number().int().min(0).default(3000),
  // Quem pode ver o QR / reconectar pelo painel. A sessão é ÚNICA para a plataforma
  // (é o número remetente de todos os prestadores) e o cadastro é público: sem esta
  // lista, ninguém gerencia pelo painel — evita que um cadastro qualquer sequestre o número.
  WHATSAPP_ADMIN_EMAILS: z
    .string()
    .default('')
    .transform((v) => v.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)),
  WHATSAPP_LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('warn'),
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
