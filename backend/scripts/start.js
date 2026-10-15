// Inicialização em produção: aplica as migrations e sobe a API.
//
// Por que um script e não só "prisma migrate deploy && node src/server.js":
//  - O schema exige DIRECT_URL (conexão sem pooler, usada pelas migrations). Se ela não
//    estiver configurada no Railway, o Prisma aborta e o deploy inteiro falha — e o Railway
//    continua servindo a versão antiga sem deixar isso óbvio. Aqui ela é derivada da
//    DATABASE_URL quando faltar (no Neon, a URL direta é a do pooler sem "-pooler").
//  - Se a migration falhar, a API sobe mesmo assim (com o erro bem visível no log): a
//    versão nova fica no ar e o /health mostra qual commit está rodando.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import 'dotenv/config';

function directUrlFrom(databaseUrl) {
  try {
    const url = new URL(databaseUrl);
    url.hostname = url.hostname.replace('-pooler.', '.');
    url.searchParams.delete('pgbouncer');
    return url.toString();
  } catch {
    return databaseUrl;
  }
}

if (!process.env.DIRECT_URL && process.env.DATABASE_URL) {
  process.env.DIRECT_URL = directUrlFrom(process.env.DATABASE_URL);
  console.warn('[start] DIRECT_URL não definida: usando a DATABASE_URL (sem "-pooler") para as migrations.');
}

const prisma = fileURLToPath(new URL('../node_modules/.bin/prisma', import.meta.url));
const migrate = spawnSync(prisma, ['migrate', 'deploy'], { stdio: 'inherit', env: process.env });
if (migrate.status !== 0) {
  console.error('[start] ❌ "prisma migrate deploy" falhou (veja acima). Subindo a API mesmo assim para não esconder a versão nova.');
}

await import('../src/server.js');
