# Validade

SaaS B2B para pequenos comércios (mercadinhos, farmácias, pet shops) evitarem perdas com produtos vencidos:
entrada rápida de lotes por código de barras, dashboard "semáforo" e alertas automáticos de queima de estoque.

## Status do MVP

- [x] **Passo 1** — Modelagem do banco (`backend/prisma/schema.prisma`)
- [x] **Passo 2** — Backend (Express, CRUD de lotes, cron diário, alertas simulados no console)
- [ ] Passo 3 — Frontend (React + Vite + Tailwind)
- [ ] Passo 4 — Integração WhatsApp

## Modelo de dados

```
Store (loja / tenant) 1 ──< User
                      1 ──< Product 1 ──< Batch 1 ──< ExpiryAlert
```

| Tabela          | Papel |
|-----------------|-------|
| `stores`        | Tenant. Guarda WhatsApp de destino, fuso e os limites do semáforo (`warning_days`=30, `critical_days`=15). |
| `users`         | `OWNER` (dashboard/financeiro) ou `OPERATOR` (só registra lotes). 1 usuário = 1 loja. |
| `products`      | Catálogo por loja; `barcode` único **dentro da loja**. `price` (venda) e `cost_price` (custo, opcional). |
| `batches`       | Lote: `expiry_date`, `initial_quantity`, `quantity` (saldo), snapshots `unit_price` e `unit_cost`. |
| `expiry_alerts` | Histórico de alertas. `UNIQUE(batch_id, level)` garante que o cron não envie duplicado. |

**Regra do semáforo** (calculada em tempo de leitura, não persistida), com `d = expiry_date - hoje` no fuso da loja:

- 🔴 Vermelho: `d < critical_days` (inclui vencidos)
- 🟡 Amarelo: `critical_days <= d <= warning_days`
- 🟢 Verde: `d > warning_days`

**Valor em risco** = `Σ quantity × (unit_cost ?? unit_price)` dos lotes `ACTIVE` — custo, com fallback para o preço de venda.

## Backend

```
backend/src/
├── server.js                 # sobe HTTP + agenda o cron
├── app.js                    # express, middlewares, /health, /api
├── routes.js                 # monta os módulos (tudo após /auth exige JWT)
├── config/env.js             # variáveis de ambiente validadas com zod
├── domain/expiry.js          # regras puras: semáforo, valor em risco, promoção
├── lib/                      # prisma, datas (fuso), erros HTTP, schemas, serializers
├── middlewares/              # auth (JWT + papéis), validate (zod), errorHandler
├── modules/
│   ├── auth/                 # registro da loja + login
│   ├── stores/  users/       # configurações da loja e equipe
│   ├── products/             # catálogo + busca por código de barras
│   ├── batches/              # entrada rápida + CRUD de lotes
│   ├── dashboard/            # resumo do semáforo
│   └── alerts/               # motor de alertas (usado pelo cron) + histórico
├── notifications/            # canal de envio (console hoje, WhatsApp no Passo 4) e textos
└── jobs/                     # agendamento diário e execução avulsa
```

### Rotas (`/api`)

| Método | Rota | Quem | Descrição |
|---|---|---|---|
| POST | `/auth/register` | público | Cria loja + usuário dono |
| POST | `/auth/login` | público | Retorna JWT |
| GET | `/auth/me` | todos | Usuário e loja logados |
| GET / PATCH | `/stores/me` | todos / dono | Config: WhatsApp, fuso, limites, % de desconto |
| GET / POST / PATCH | `/users`, `/users/:id` | dono | Equipe (operadores de caixa) |
| GET | `/products?search=` | todos | Catálogo |
| GET | `/products/barcode/:barcode` | todos | Busca após leitura da câmera (404 = produto novo) |
| POST | `/products` | todos | Cadastro de produto |
| PATCH / DELETE | `/products/:id` | dono | Preço/custo; delete bloqueado (409) se houver lotes |
| **POST** | **`/batches`** | todos | **Entrada rápida**: `{ barcode, expiryDate, quantity, product? }` |
| GET | `/batches?semaphore=red\|yellow\|green\|expired&status=&search=` | todos | Lista ordenada por validade |
| GET / PATCH | `/batches/:id` | todos | Detalhe; baixa (`quantity`), descarte (`status`), correção de validade |
| DELETE | `/batches/:id` | dono | Remove lançamento errado |
| GET | `/dashboard/summary` | dono | Totais por cor + valor em risco + lotes prioritários |
| GET | `/alerts?level=&status=` | dono | Histórico de notificações |
| POST | `/alerts/run` | dono | Executa agora a verificação do cron para a loja |

### Job diário (`src/jobs/expiryCheck.job.js`)

Todo dia às 08:00 (`CRON_SCHEDULE`, fuso `CRON_TIMEZONE`), para cada loja:

1. Busca lotes `ACTIVE` com saldo e `expiry_date < hoje + critical_days`.
2. Cria um alerta `CRITICAL` (ou `EXPIRED` se já venceu) — no máximo um por lote/nível.
3. Envia alertas `PENDING`/`FAILED` (até `ALERT_MAX_ATTEMPTS`) pelo notificador, com o texto refeito com os dados do dia.

Lotes que já entram na zona vermelha disparam o alerta **na hora**, sem esperar o cron.
Também é possível rodar avulso com `npm run job:expiry`.

## Rodando

```bash
cd backend
cp .env.example .env   # preencha com as URLs do Supabase e um JWT_SECRET
npm install
npm run prisma:deploy
npm run dev            # http://localhost:3333
```

Testes: `npm test` roda os unitários; com `TEST_DATABASE_URL=postgresql://...` roda também o
teste ponta a ponta (o banco de teste é **truncado** — nunca use o de produção).
