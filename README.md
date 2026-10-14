# Validade

SaaS B2B para pequenos comércios (mercadinhos, farmácias, pet shops) evitarem perdas com produtos vencidos:
entrada rápida de lotes por código de barras, dashboard "semáforo" e alertas automáticos de queima de estoque.

## Status do MVP

- [x] **Passo 1** — Modelagem do banco (`backend/prisma/schema.prisma`)
- [x] **Passo 2** — Backend (Express, CRUD de lotes, cron diário, alertas simulados no console)
- [x] **Passo 3** — Frontend (React + Vite + Tailwind)
  - [x] Tela de leitura de código de barras e entrada rápida
  - [x] Dashboard semáforo do dono com queima de estoque
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
| `products`      | Catálogo por loja; `barcode` único **dentro da loja**. `price` (venda), `cost_price` (custo, opcional) e `image_url` (foto). |
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
| GET | `/dashboard/summary?limit=` | dono | Totais por cor, valor em risco e lista de ação (amarelos + vermelhos por validade) |
| GET | `/alerts?level=&status=` | dono | Histórico de notificações |
| POST | `/alerts/run` | dono | Executa agora a verificação do cron para a loja |

### Job diário (`src/jobs/expiryCheck.job.js`)

Todo dia às 08:00 (`CRON_SCHEDULE`, fuso `CRON_TIMEZONE`), para cada loja:

1. Busca lotes `ACTIVE` com saldo e `expiry_date < hoje + critical_days`.
2. Cria um alerta `CRITICAL` (ou `EXPIRED` se já venceu) — no máximo um por lote/nível.
3. Envia alertas `PENDING`/`FAILED` (até `ALERT_MAX_ATTEMPTS`) pelo notificador, com o texto refeito com os dados do dia.

Lotes que já entram na zona vermelha disparam o alerta **na hora**, sem esperar o cron.
Também é possível rodar avulso com `npm run job:expiry`.

## Frontend

```
frontend/src/
├── pages/
│   ├── LoginPage.jsx           # login / cadastro da loja
│   ├── ScanPage.jsx            # /entrada — Entrada Rápida (operador e dono)
│   └── DashboardPage.jsx       # /painel  — Painel Semáforo (só dono)
├── hooks/
│   ├── useQuickEntry.js        # máquina de estados: scan -> lookup -> form -> salvar
│   └── useDashboard.js         # carrega o resumo e recarrega ao voltar para o app
├── components/
│   ├── dashboard/
│   │   ├── SummaryCards.jsx    # card vermelho (valor em risco) em destaque + amarelo + verde
│   │   ├── ActionList.jsx      # só amarelos/vermelhos, por validade, com filtro
│   │   ├── ActionItem.jsx      # foto, nome, dias, qtd., prejuízo potencial, ação
│   │   └── PromoModal.jsx      # texto da promoção, desconto ajustável, copiar p/ WhatsApp
│   ├── scan/
│   │   ├── BarcodeScanner.jsx  # câmera traseira + zxing (EAN-13/8, UPC, CODE-128), lanterna
│   │   ├── ManualCodeModal.jsx # plano B: digitar o código
│   │   ├── ProductCard.jsx     # foto + nome para conferência
│   │   ├── BatchEntryForm.jsx  # validade (DD/MM/AAAA ou MM/AAAA) + quantidade, prévia do semáforo
│   │   ├── NewProductModal.jsx # mini-cadastro (nome, custo, venda) no 404/422
│   │   └── RecentEntries.jsx   # últimos lançamentos da sessão
│   ├── ui/                     # Button, Modal (bottom sheet), Field, MoneyInput, ProductThumb...
│   └── layout/AppShell.jsx     # cabeçalho + navegação (abas no rodapé no celular, só para o dono)
├── context/AuthContext.jsx     # sessão (JWT) persistida
└── lib/                        # api, datas, promo, clipboard, Open Food Facts, feedback (bip/vibração)
```

**Painel do dono:** o card vermelho mostra o valor em risco (`custo × quantidade`, com fallback para o
preço de venda) dos lotes com menos de `critical_days` + vencidos. A lista de ação traz só amarelos e
vermelhos. Vermelhos ainda dentro da validade têm **Gerar promoção**: texto pronto com o
`suggested_discount_pct` da loja sobre o preço de venda atual (ajustável 20–50%), quanto entra no caixa
vendendo tudo e aviso se ficar abaixo do custo; **Copiar para o WhatsApp** ou abrir direto via `wa.me`.
Lotes vencidos não recebem promoção — produto vencido não pode ser vendido (CDC, art. 18 §6º).

Fluxo: lê o código → `GET /products/barcode/:code` (em paralelo busca foto/nome no Open Food Facts)
→ produto existe: mostra o card · não existe: abre o mini-cadastro já com o nome sugerido
→ operador digita validade + quantidade → `POST /batches` (cria produto + lote juntos se for novo)
→ se a API responder `422 PRODUCT_NOT_FOUND`, abre o mini-cadastro e salva sozinho ao confirmar.

> A câmera só abre em **https** ou `localhost`. Para testar no celular pela rede: `npm run dev:https`
> e acesse `https://<ip-do-computador>:5173` (aceite o certificado de desenvolvimento).

## Rodando

```bash
cd backend
cp .env.example .env   # preencha com as URLs do Supabase e um JWT_SECRET
npm install
npm run prisma:deploy
npm run dev            # http://localhost:3333

cd ../frontend
npm install
npm run dev            # http://localhost:5173 (proxy /api -> :3333)
```

Em produção, defina `VITE_API_URL` (ex: `https://api.seudominio.com/api`) no build do frontend
e inclua a origem do frontend em `CORS_ORIGIN` no backend.

Testes: `npm test` roda os unitários; com `TEST_DATABASE_URL=postgresql://...` roda também o
teste ponta a ponta (o banco de teste é **truncado** — nunca use o de produção).
