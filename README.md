# Validade

SaaS B2B para pequenos comércios (mercadinhos, farmácias, pet shops) evitarem perdas com produtos vencidos:
entrada rápida de lotes por código de barras, dashboard "semáforo" e alertas automáticos de queima de estoque.

## Status do MVP

- [x] **Passo 1** — Modelagem do banco (`backend/prisma/schema.prisma`)
- [ ] Passo 2 — Backend (Express, CRUD de lotes, cron diário)
- [ ] Passo 3 — Frontend (React + Vite + Tailwind)
- [ ] Passo 4 — Integração WhatsApp (simulada)

## Modelo de dados

```
Store (loja / tenant) 1 ──< User
                      1 ──< Product 1 ──< Batch 1 ──< ExpiryAlert
```

| Tabela          | Papel |
|-----------------|-------|
| `stores`        | Tenant. Guarda WhatsApp de destino, fuso e os limites do semáforo (`warning_days`=30, `critical_days`=15). |
| `users`         | `OWNER` (dashboard/financeiro) ou `OPERATOR` (só registra lotes). |
| `products`      | Catálogo por loja; `barcode` único **dentro da loja**. `price` é a base do valor em risco. |
| `batches`       | Lote: `expiry_date`, `initial_quantity`, `quantity` (saldo), `unit_price` (snapshot). |
| `expiry_alerts` | Histórico de alertas. `UNIQUE(batch_id, level)` garante que o cron não envie duplicado. |

**Regra do semáforo** (calculada em tempo de leitura, não persistida), com `d = expiry_date - hoje`:

- 🔴 Vermelho: `d < critical_days` (inclui vencidos)
- 🟡 Amarelo: `critical_days <= d <= warning_days`
- 🟢 Verde: `d > warning_days`

**Valor em risco** = `Σ quantity × unit_price` dos lotes `ACTIVE` em vermelho.

## Setup do banco

```bash
cd backend
cp .env.example .env   # preencha com as URLs do Supabase
npm install
npx prisma migrate deploy
```
