# Meus Orçamentos

SaaS de **orçamentos e cobranças** para prestadores de serviço autônomos (eletricistas, encanadores,
marceneiros, técnicos de manutenção). O nome é provisório: troque em `frontend/src/lib/brand.js`.

> Este repositório nasceu como o "iValida" (controle de validade para pequenos comércios). O produto
> foi substituído; o que foi reaproveitado é a base técnica: Express, Prisma/PostgreSQL (Neon), login
> com JWT, React + Tailwind e a sessão do WhatsApp (Baileys).

## Status

- [x] **Etapa 1** — Banco novo (clientes, orçamentos, itens), CRUD de `clients` e `quotes`, Dashboard
- [x] **Etapa 2** — Tela Novo Orçamento (cliente na hora, itens dinâmicos, total ao vivo), Visualizar Orçamento e Gerar PDF
- [ ] Editar orçamento / aprovar e rejeitar pela interface
- [ ] Envio do orçamento e cobrança pelo WhatsApp

## Modelo de dados (`backend/prisma/schema.prisma`)

| Tabela        | Para quê |
|---------------|----------|
| `users`       | O prestador (login). Todos os dados são escopados por ele. |
| `clients`     | `name`, `phone` (WhatsApp, E.164), `address`. Pertence a um prestador. |
| `quotes`      | `status` (`PENDING` Pendente · `APPROVED` Aprovado · `REJECTED` Rejeitado), `totalAmount`, `expiresAt`, `respondedAt`, `paymentTerms` e `pixKey` (opcionais, vão no PDF). |
| `quote_items` | `description`, `quantity` (aceita fração: 2,5 m), `unitPrice`, `position` (ordem no orçamento). |

- `totalAmount` é calculado **no servidor** (soma em centavos de `quantity × unitPrice`), nunca enviado pelo cliente.
- `respondedAt` é preenchido ao aprovar/rejeitar: é ele que define "Aprovados no Mês".
- Cliente com orçamentos não pode ser excluído (`409 IN_USE`): o histórico financeiro fica preservado.

## Backend (`backend/`)

```
src/
├── app.js / server.js        # Express + CORS + Helmet; inicia o WhatsApp
├── config/env.js             # variáveis de ambiente validadas com zod
├── middlewares/              # authenticate (JWT), validate (zod), errorHandler
├── modules/
│   ├── auth/                 # cadastro, login, /me
│   ├── clients/              # CRUD de clientes
│   ├── quotes/               # CRUD de orçamentos + resumo do Dashboard
│   └── notifications/        # status/QR/reconexão do WhatsApp (admin)
└── notifications/            # providers console | whatsapp (Baileys), fila anti-bloqueio
```

### Rotas (`/api`)

| Método | Rota | Descrição |
|---|---|---|
| POST | `/auth/register` | Cria a conta do prestador `{ name, email, password, phone? }` |
| POST | `/auth/login` | Retorna JWT |
| GET | `/auth/me` | Usuário logado |
| GET / POST | `/clients` | Lista (`?search=`) / cria cliente |
| GET / PATCH / DELETE | `/clients/:id` | Detalhe / edita / exclui (409 se tiver orçamentos) |
| GET | `/quotes/summary` | Dashboard: aprovados no mês, aguardando resposta, taxa de fechamento, últimos 5 |
| GET / POST | `/quotes` | Lista (`?status=&clientId=`) / cria `{ clientId, expiresAt?, items[] }` |
| GET / PATCH / DELETE | `/quotes/:id` | Detalhe com itens / muda `status`, `expiresAt` ou substitui `items` / exclui |
| PATCH | `/quotes/:id/status` | Prestador marca `APPROVED` / `REJECTED` (grava `respondedAt`) ou volta para `PENDING` |
| GET | `/notifications/status` | Estado da sessão do WhatsApp |
| GET / POST | `/notifications/whatsapp/qr`, `/reconnect` | QR e reconexão (só `WHATSAPP_ADMIN_EMAILS`) |

**Taxa de fechamento** = aprovados ÷ (aprovados + rejeitados). Pendentes não entram na conta.

### WhatsApp

O Baileys continua conectado (QR no terminal e no indicador do cabeçalho para o admin), mas o bot
está **silencioso**: não há cron nem envio automático. O envio de orçamentos entra numa próxima etapa
usando o mesmo contrato `send()` de `src/notifications`.

## Frontend (`frontend/`)

```
src/
├── pages/LoginPage.jsx        # entrar / criar conta
├── pages/DashboardPage.jsx    # saudação, 3 cards, últimos orçamentos, botão "Novo Orçamento"
├── pages/NewQuotePage.jsx     # /orcamentos/novo — cliente (ou cadastro rápido), itens, total, salvar
├── pages/QuoteViewPage.jsx    # /orcamentos/:id — resumo do orçamento + "Gerar PDF"
├── components/quotes/QuotePdf.jsx # documento A4 (@react-pdf/renderer, carregado só ao gerar)
├── hooks/useQuotesSummary.js  # GET /quotes/summary
├── lib/quotes.js              # rótulos e selos de status
├── lib/brand.js               # nome do produto (provisório)
└── components/                # layout, ui (Button, Field, Modal, MoneyInput, Toast) e whatsapp
```

Visual mobile-first em azul-marinho, cinza e branco (`--color-navy-*` em `index.css`).

## Rodando

```bash
# Backend
cd backend
cp .env.example .env            # DATABASE_URL / DIRECT_URL / JWT_SECRET
npm install
npm run dev                     # aplica as migrations e sobe em :3333
npm run db:seed                 # opcional: dados de exemplo (demo@prestador.com / senha-demo)

# Frontend
cd frontend
npm install
npm run dev                     # :5173 (o Vite repassa /api para localhost:3333)
```

### Criar as tabelas sem terminal (SQL Editor do Neon)

`backend/prisma/neon-init.sql` é a migration inicial pronta para colar no SQL Editor do Neon
(cria o schema, as tabelas e registra a migration para o Prisma não tentar aplicá-la de novo).
Rode uma única vez, num banco vazio.

### Zerar o banco antigo no Neon

As migrations recomeçaram do zero. Num banco que ainda tem as tabelas do iValida, rode **uma vez**
dentro de `backend/` (⚠️ apaga todos os dados do banco apontado):

```bash
DATABASE_URL="<string Direct do Neon>" DIRECT_URL="<string Direct do Neon>" \
  npx prisma migrate reset --force --skip-seed
```

### Testes

```bash
cd backend
TEST_DATABASE_URL=postgresql://... npm test   # integração contra um Postgres real (o banco é LIMPO)
```

## Deploy

Veja [DEPLOY.md](DEPLOY.md) (Neon + Railway com volume para a sessão do WhatsApp + Netlify/Vercel).
