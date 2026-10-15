# Guia de Deploy — iValida (MVP)

Guia para colocar o Validade no ar com custo mínimo, sem perder a sessão do WhatsApp a cada deploy.

> Preços e limites conferidos em **outubro/2026**. Planos de nuvem mudam com frequência:
> confira a página oficial de cada serviço antes de assinar.

---

## 1. Arquitetura recomendada

```
 Celular / PC do lojista
          │ HTTPS
          ▼
 ┌──────────────────────┐        ┌───────────────────────────────┐        ┌─────────────────┐
 │ Frontend (Netlify)   │  /api  │ Backend Node (Railway)        │  SQL   │ Postgres (Neon) │
 │ React estático + CDN │ ─────► │ Express + cron + Baileys      │ ─────► │ free tier       │
 └──────────────────────┘        │ Volume /data ← sessão do WA   │        └─────────────────┘
                                 └──────────────┬────────────────┘
                                                │ WebSocket
                                                ▼
                                         WhatsApp (número de envio)
```

| Peça | Serviço | Por quê | Custo estimado |
|---|---|---|---|
| Banco | **Neon** (Free) | Postgres serverless que **não pausa** o projeto; suspende só a computação ociosa e acorda em ~1s | US$ 0 |
| Backend | **Railway** (Hobby) | Processo sempre ligado (cron + WebSocket do WhatsApp) e **volume persistente** simples | US$ 5/mês (inclui US$ 5 de uso) |
| Frontend | **Netlify** (Free) | Site estático com HTTPS (a câmera exige HTTPS) e plano gratuito que permite uso comercial | US$ 0 |
| **Total** | | | **≈ US$ 5/mês** |

### Por que não as outras opções

- **Render gratuito:** o serviço **dorme após 15 min** sem acesso. O cron das 8h não roda e a sessão
  do WhatsApp cai. Disco persistente só existe em instância paga (a partir de US$ 7/mês + US$ 0,25/GB),
  o que é viável, mas mais caro que o Railway para este caso (veja a seção 4.2).
- **Supabase gratuito:** funciona, mas **pausa projetos após ~7 dias de inatividade**, e um projeto
  pausado fica fora do ar até ser reativado manualmente. Uma loja que passa uma semana sem abrir o app
  correria esse risco. Veja a seção 3.2 se preferir Supabase.
- **Vercel Hobby:** ótimo para o frontend técnico, mas os termos do plano gratuito restringem o uso a
  projetos **pessoais e não comerciais**. Para um SaaS cobrado, use Netlify (ou Vercel Pro).

---

## 2. Antes de começar

- [ ] Código no GitHub (este repositório).
- [ ] Contas em [neon.com](https://neon.com), [railway.com](https://railway.com) e [netlify.com](https://netlify.com).
- [ ] Um **chip dedicado** com WhatsApp para enviar os alertas. O Baileys é um cliente não oficial:
      não use o número pessoal nem o número principal da loja.
- [ ] Gere um segredo para o JWT:
      `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

---

## 3. Banco de dados

### 3.1 Neon (recomendado)

1. **New Project** → região **AWS São Paulo (sa-east-1)** se disponível (senão, a mais próxima do Railway).
   Postgres 16 ou mais recente.
2. Em **Connect**, copie **duas** strings de conexão:
   - **Pooled** (o host contém `-pooler`) → será o `DATABASE_URL`
   - **Direct** (sem `-pooler`) → será o `DIRECT_URL` (usado pelas migrations)
3. Garanta `sslmode=require` no fim das duas, por exemplo:
   ```
   DATABASE_URL=postgresql://user:senha@ep-xxx-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&pgbouncer=true&connect_timeout=15
   DIRECT_URL=postgresql://user:senha@ep-xxx.sa-east-1.aws.neon.tech/neondb?sslmode=require&connect_timeout=15
   ```
   - `pgbouncer=true` avisa o Prisma que a conexão passa por um pooler.
   - `connect_timeout=15` dá tempo para o Neon "acordar" a computação suspensa.

Você **não** precisa criar tabelas: o backend roda `prisma migrate deploy` a cada inicialização.

**Limites do Free:** 0,5 GB de armazenamento (milhares de lojas pequenas cabem) e 100 CU-horas por
mês. A computação suspende após 5 min ociosa. Se vários painéis ficarem abertos o dia todo, o polling
de status mantém o banco acordado e consome horas; nesse caso, acompanhe o uso no console do Neon.

### 3.2 Alternativa: Supabase

1. **New project** → região **South America (São Paulo)**.
2. **Connect → ORMs → Prisma** e copie:
   - `DATABASE_URL`: **Transaction pooler**, porta **6543**, com `?pgbouncer=true`
   - `DIRECT_URL`: **Session pooler**, porta **5432** (host `...pooler.supabase.com`)
3. ⚠️ **Não** use a conexão direta `db.<ref>.supabase.co` como `DIRECT_URL`: ela é **somente IPv6** e
   costuma falhar a partir de hospedagens com saída IPv4, como o Railway. O session pooler é o caminho
   compatível com IPv4.
4. Lembre da pausa por inatividade no plano Free (seção 1). No Pro (US$ 25/mês) não há pausa.

---

## 4. Backend (Node.js + WhatsApp)

O backend precisa de duas coisas que plataformas "serverless" não dão:
**processo sempre ligado** (cron + conexão do WhatsApp) e **disco persistente** (sessão do Baileys).

### 4.1 Railway (recomendado)

1. **New Project → Deploy from GitHub repo** → escolha o repositório.
2. No serviço criado, em **Settings**:
   - **Root Directory:** `backend`. O `backend/railway.json` já define o build, o comando
     `npm run start:prod` (migrations + servidor), o healthcheck em `/health` e o restart automático.
   - **Serverless / App Sleeping:** **desligado**. O processo precisa ficar sempre ativo.
   - **Replicas:** 1 (o Railway já força 1 réplica quando há volume).
3. **Volume** (o passo que impede o QR de ser pedido a cada deploy):
   - Clique com o botão direito no serviço → **Attach Volume** (ou `Ctrl+K` → *Volume*).
   - **Mount path:** `/data`. ⚠️ Confira que não há **espaço sobrando** no fim do caminho: é uma causa
     conhecida de "volume que esvazia a cada deploy".
   - 1 GB é muito mais do que suficiente (a sessão ocupa poucos MB).
4. **Variables** (aba *Variables* → *Raw Editor*):
   ```env
   NODE_ENV=production
   DATABASE_URL=<pooled do Neon>
   DIRECT_URL=<direct do Neon>
   JWT_SECRET=<o segredo gerado no passo 2>
   JWT_EXPIRES_IN=7d

   # Frontend que pode chamar a API (preencha depois do passo 5; sem barra no fim)
   CORS_ORIGIN=https://validade.netlify.app

   CRON_ENABLED=true
   CRON_SCHEDULE=0 8 * * *
   CRON_TIMEZONE=America/Sao_Paulo

   NOTIFIER=whatsapp
   WHATSAPP_AUTH_DIR=/data/wa-session
   WHATSAPP_ADMIN_EMAILS=seu-email@dominio.com
   WHATSAPP_SEND_INTERVAL_MS=3000
   WHATSAPP_LOG_LEVEL=warn
   ALERT_MAX_ATTEMPTS=3
   ```
   - `WHATSAPP_AUTH_DIR` **precisa** ficar dentro do mount path do volume (`/data/...`).
   - `WHATSAPP_ADMIN_EMAILS` define quem pode ver o QR e reconectar pelo painel. Use o e-mail com o
     qual **você** vai criar a conta. Sem ele, o QR aparece só nos logs do Railway.
   - Não defina `PORT`: o Railway injeta a porta sozinho e o servidor já lê `process.env.PORT`.
5. **Networking → Generate Domain**. Você recebe algo como `https://validade-api.up.railway.app`.
   Teste: `https://validade-api.up.railway.app/health` deve responder `{"status":"ok"}`.
6. Em **Deployments → View logs**, confira:
   ```
   All migrations have been successfully applied.   (ou "No pending migrations")
   🚀 Validade API ouvindo em ...
   [notificações] canal ativo: whatsapp
   [cron] expiry-check agendado: "0 8 * * *" (America/Sao_Paulo)
   ```
   O QR também é impresso aqui, mas você vai escanear pelo painel (seção 6).

**Custo:** o Hobby cobra US$ 5/mês, que já incluem US$ 5 de uso. Um processo Node pequeno (~200 MB de
RAM, CPU quase ociosa) mais 1 GB de volume (~US$ 0,15/GB-mês) costuma caber nesse crédito. Ative
**Usage Limits** no Railway para não ter surpresas.

**Redeploys:** serviços com volume têm **alguns segundos de queda** a cada deploy, porque o Railway
derruba o container antigo antes de montar o volume no novo. Isso é esperado e até desejável aqui:
garante que nunca existam duas instâncias disputando a mesma sessão do WhatsApp. Alertas gerados nesse
intervalo ficam pendentes e saem quando a conexão volta.

### 4.2 Alternativa: Render (pago)

- **Web Service** → Root Directory `backend` → Build `npm ci` → Start `npm run start:prod`.
- Instância **Starter (US$ 7/mês)** ou superior. O Free dorme e **não aceita disco**.
- **Disks → Add Disk**: mount path `/data`, 1 GB (US$ 0,25/GB-mês) → `WHATSAPP_AUTH_DIR=/data/wa-session`.
- Mesmas variáveis do Railway. Health Check Path: `/health`.

---

## 5. Frontend (React)

### 5.1 Netlify (recomendado)

1. **Add new site → Import an existing project** → GitHub → repositório.
2. **Base directory:** `frontend`. O `frontend/netlify.toml` já configura o build (`npm run build`),
   a pasta `dist` e o redirect de SPA (sem ele, recarregar `/painel` dá 404).
3. **Environment variables:**
   ```env
   VITE_API_URL=https://validade-api.up.railway.app/api
   ```
   Variáveis `VITE_*` entram **no build**: se mudar a URL da API, faça um novo deploy do frontend.
4. Deploy. Você recebe `https://<nome>.netlify.app` (renomeie em *Site configuration → Change site name*).
5. **Volte ao Railway** e ajuste `CORS_ORIGIN` para essa URL exata (com `https://` e sem barra no fim).
   Se tiver mais de uma origem, separe por vírgula.

### 5.2 Alternativa: Vercel

- **Add New → Project** → repositório → **Root Directory:** `frontend` → preset **Vite**.
- `VITE_API_URL` em *Environment Variables*. O `frontend/vercel.json` já faz o rewrite de SPA.
- Lembre que o plano Hobby é para uso **não comercial**; para o SaaS em produção, use o Pro.

### 5.3 Domínio próprio (opcional)

Registre um `.com.br` no [registro.br](https://registro.br) (≈ R$ 40/ano) e aponte:
`app.seudominio.com.br` → Netlify e `api.seudominio.com.br` → Railway (*Custom Domain*, ambos com HTTPS
automático). Depois atualize `VITE_API_URL` (e faça um novo deploy do frontend) e `CORS_ORIGIN`.

---

## 6. Primeiro acesso: ligando tudo

1. Abra o frontend no celular → **Primeira vez? Cadastre sua loja** → use **o mesmo e-mail** que você
   colocou em `WHATSAPP_ADMIN_EMAILS` e informe o WhatsApp que vai **receber** os alertas.
2. No cabeçalho, o indicador do WhatsApp estará **vermelho** → toque nele.
3. O QR aparece no modal. No **celular do chip dedicado**: WhatsApp → *Aparelhos conectados* →
   *Conectar aparelho* → aponte para a tela. O indicador fica **verde** em segundos.
4. No mesmo modal, toque em **Enviar teste**: a mensagem "✅ Tudo certo!" deve chegar no número da loja.
5. Teste o fluxo real: na aba **Entrada**, registre um lote que vence em menos de 15 dias. O alerta
   chega na hora.
6. **Redeploy** pelo Railway e confirme que o indicador volta ao verde **sem pedir QR**. Esse é o teste
   que prova que o volume está funcionando.

---

## 7. Checklist pós-deploy

- [ ] `GET /health` responde `{"status":"ok"}`
- [ ] Logs mostram as migrations aplicadas e `canal ativo: whatsapp`
- [ ] Login funciona pelo domínio do frontend (se falhar com erro de CORS, revise `CORS_ORIGIN`)
- [ ] Recarregar `/painel` no navegador **não** dá 404 (redirect de SPA ativo)
- [ ] A câmera abre na tela de Entrada (exige HTTPS, que Netlify e Vercel já dão)
- [ ] Indicador verde, mensagem de teste recebida
- [ ] Após redeploy, o WhatsApp reconecta **sem** QR
- [ ] Usage Limits configurado no Railway

---

## 8. Operação do dia a dia

| Situação | O que acontece / o que fazer |
|---|---|
| Internet do servidor oscila | Reconexão automática (indicador amarelo). Alertas ficam pendentes e saem ao reconectar. |
| Indicador vermelho | Toque nele e escaneie o QR de novo (só o admin vê o QR). |
| Alguém desconectou o aparelho no celular | A sessão é apagada e um QR novo é gerado: escaneie pelo painel. |
| "Sessão aberta em outro lugar" | Outra instância usou a mesma sessão (ex: você rodou o backend local com a mesma pasta). Feche a outra e clique em **Retomar sessão aqui**. |
| Volume perdido / trocado | Nada de grave: só é preciso escanear o QR de novo. Os dados de negócio estão no Postgres. |
| Número banido pelo WhatsApp | Troque o chip, escaneie o QR com o novo número. Considere migrar para Z-API, Evolution API ou a API oficial (novo provider em `backend/src/notifications/providers/`). |
| Rodar o backend localmente | Use `NOTIFIER=console` ou **outra pasta e outro número**: duas instâncias com a mesma sessão se derrubam. |

**Backups:** o Neon Free guarda um histórico curto para restauração. Para um backup próprio, rode
periodicamente `pg_dump "$DIRECT_URL" > backup.sql` (por exemplo, num GitHub Action agendado).

**Escala:** o backend roda em **uma** instância por causa da sessão única do WhatsApp. Se um dia
precisar de várias réplicas, mova o envio para um provider HTTP (Z-API, Evolution, Meta) ou para um
worker separado. O contrato em `notifications/index.js` foi pensado para isso.

---

## 9. Problemas comuns

| Sintoma | Causa provável | Solução |
|---|---|---|
| Deploy falha em `prisma migrate deploy` com `P1001` | `DIRECT_URL` errado ou inacessível | Neon: use a string **sem** `-pooler`. Supabase: **session pooler** (porta 5432), não `db.<ref>.supabase.co`. |
| `prepared statement "s0" already exists` | `DATABASE_URL` aponta para um pooler sem `pgbouncer=true` | Acrescente `pgbouncer=true` à URL pooled. |
| QR pedido a cada deploy | Volume não montado ou `WHATSAPP_AUTH_DIR` fora dele | Mount `/data` (sem espaço no fim) e `WHATSAPP_AUTH_DIR=/data/wa-session`. |
| Indicador vermelho, mas o QR não aparece para mim | E-mail fora de `WHATSAPP_ADMIN_EMAILS` | Ajuste a variável no Railway (vale após reiniciar). |
| Erro de CORS no navegador | `CORS_ORIGIN` diferente da URL do frontend | URL exata, com `https://`, sem barra no fim. |
| 404 ao recarregar `/painel` | Redirect de SPA ausente | Confirme `frontend/netlify.toml` (ou `vercel.json`) e o Base directory `frontend`. |
| Cron não dispara | Serviço dormindo | Desligue *App Sleeping* (Railway) ou saia do plano Free (Render). |
| Variável de ambiente inválida | Validação do `config/env.js` | O log lista exatamente qual variável e o motivo. |
