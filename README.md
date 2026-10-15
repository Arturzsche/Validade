# iValida

SaaS B2B para pequenos comércios (mercadinhos, farmácias, pet shops) evitarem perdas com produtos vencidos:
entrada rápida de lotes por código de barras, dashboard "semáforo" e alertas automáticos de queima de estoque.

## Status do MVP

- [x] **Passo 1** — Modelagem do banco (`backend/prisma/schema.prisma`)
- [x] **Passo 2** — Backend (Express, CRUD de lotes, cron diário, alertas simulados no console)
- [x] **Passo 3** — Frontend (React + Vite + Tailwind)
  - [x] Tela de leitura de código de barras e entrada rápida
  - [x] Dashboard semáforo do dono com queima de estoque
- [x] **Passo 4** — Integração WhatsApp (Baileys, QR no terminal, reconexão automática)

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
├── notifications/
│   ├── index.js              # contrato do provider + registro (NOTIFIER=console|whatsapp)
│   ├── providers/            # console.provider.js · baileys.provider.js (trocar por Z-API/Evolution = novo arquivo aqui)
│   ├── errors.js             # NotifierUnavailableError (espera) × RecipientError (falha)
│   ├── sendQueue.js          # intervalo mínimo entre mensagens (anti-bloqueio)
│   └── messages.js           # textos dos alertas
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
| GET | `/products?search=` | todos | Catálogo (busca sem acento por nome, ou início do código), com `activeBatches` |
| GET | `/products/barcode/:barcode` | todos | Busca após leitura da câmera (404 = produto novo) |
| POST | `/products` | todos | Cadastro de produto |
| PATCH | `/products/:id` | dono | Nome, preço e custo (o código de barras não muda) |
| DELETE | `/products/:id` | dono | 409 se houver itens ativos na prateleira; arquiva se só houver histórico; apaga se não houver registros |
| **POST** | **`/batches`** | todos | **Entrada rápida**: `{ barcode, expiryDate, quantity, product? }` |
| GET | `/batches?semaphore=red\|yellow\|green\|expired&status=&search=` | todos | Lista ordenada por validade |
| GET / PATCH | `/batches/:id` | todos | Detalhe; baixa (`quantity`), descarte (`status`), correção de validade |
| DELETE | `/batches/:id` | dono | Remove lançamento errado |
| GET | `/dashboard/summary?limit=` | dono | Totais por cor, valor em risco e lista de ação (amarelos + vermelhos por validade) |
| GET | `/alerts?level=&status=` | dono | Histórico de notificações |
| POST | `/alerts/run` | dono | Executa agora a verificação do cron para a loja |
| GET | `/notifications/status` | dono | Estado do canal (ex: `waiting_qr`, `open`, `reconnecting`) |
| POST | `/notifications/test` | dono | Envia uma mensagem de teste ao WhatsApp da loja |
| GET | `/notifications/whatsapp/qr` | admin* | QR atual como imagem PNG (painel reconecta sem terminal) |
| POST | `/notifications/whatsapp/reconnect` | admin* | Gera novo QR / retoma a sessão agora |

\* admin = e-mail listado em `WHATSAPP_ADMIN_EMAILS`. A sessão do WhatsApp é **uma só para a
plataforma** e o cadastro de loja é público; sem essa lista ninguém vê o QR pelo painel, o que
impede que um cadastro qualquer sequestre o número remetente de todas as lojas.

### Job diário (`src/jobs/expiryCheck.job.js`)

Todo dia às 08:00 (`CRON_SCHEDULE`, fuso `CRON_TIMEZONE`), para cada loja:

1. Busca lotes `ACTIVE` com saldo e `expiry_date < hoje + critical_days`.
2. Cria um alerta `CRITICAL` (ou `EXPIRED` se já venceu) — no máximo um por lote/nível.
3. Envia alertas `PENDING`/`FAILED` (até `ALERT_MAX_ATTEMPTS`) pelo notificador, com o texto refeito com os dados do dia.

Lotes que já entram na zona vermelha disparam o alerta **na hora**, sem esperar o cron.
Também é possível rodar avulso com `npm run job:expiry`.

## WhatsApp (Passo 4)

Os alertas saem por um provider plugável (`src/notifications`). O motor de alertas só conhece o
contrato `send / isReady / onReady / status` — para migrar para Z-API, Evolution API ou a API oficial,
basta criar um novo arquivo em `providers/` e registrá-lo em `notifications/index.js`.

O provider padrão de produção usa **Baileys** (WebSocket do WhatsApp Web, sem navegador):

- **QR no terminal** (`qrcode-terminal`) **e no painel**: o indicador do WhatsApp no cabeçalho
  (verde/amarelo/vermelho) abre um modal com o QR atualizado. A sessão fica salva em `WHATSAPP_AUTH_DIR`.
- **Reconexão automática** com backoff exponencial (1s → 60s); logout feito pelo celular apaga a
  sessão e gera QR novo; se a sessão for aberta em outra instância, para de reconectar (evita disputa).
- **Canal fora do ar não perde alerta**: fica `PENDING` sem consumir tentativa e é enviado
  automaticamente quando a conexão volta.
- Fila com intervalo mínimo entre mensagens (`WHATSAPP_SEND_INTERVAL_MS`, padrão 3s).

> ⚠️ Baileys é um cliente **não oficial**: o WhatsApp pode banir números que disparam em volume.
> Use um chip dedicado. Apenas **uma** instância do servidor pode manter a sessão aberta.

### Teste de disparo real

```bash
cd backend
# .env: NOTIFIER=whatsapp  (e as URLs do banco / JWT_SECRET)
# Opcional, para ver o cron disparar rápido: CRON_SCHEDULE="*/1 * * * *"
npm run dev
```

1. O QR aparece no terminal → no celular de testes: **WhatsApp › Aparelhos conectados › Conectar aparelho**.
   Aguarde `[whatsapp] ✅ Conectado como ...`.
2. Cadastre a loja com o número que vai **receber** os alertas (pode ser outro celular):
   ```bash
   curl -X POST localhost:3333/api/auth/register -H 'content-type: application/json' \
     -d '{"storeName":"Minha Loja","whatsappPhone":"+5511999998888","name":"Dono","email":"dono@teste.com","password":"12345678"}'
   ```
   (guarde o `token` da resposta; para trocar o número depois: `PATCH /api/stores/me`)
3. Mensagem de teste: `curl -X POST localhost:3333/api/notifications/test -H "Authorization: Bearer $TOKEN"`
4. Alerta real: registre pela tela de Entrada um lote vencendo em menos de 15 dias — o alerta sai na hora.
   Ou rode o cron sob demanda: `curl -X POST localhost:3333/api/alerts/run -H "Authorization: Bearer $TOKEN"`.
5. Teste de queda: desligue a internet do servidor por alguns segundos e veja a reconexão no log;
   alertas gerados nesse intervalo saem sozinhos quando voltar.

Em Railway/Render, monte um **volume persistente** em `WHATSAPP_AUTH_DIR`; sem ele o QR é pedido a cada deploy.

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

## Deploy

Passo a passo de produção (Neon + Railway com volume + Netlify, ≈ US$ 5/mês) em **[DEPLOY.md](DEPLOY.md)**.

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
