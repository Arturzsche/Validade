// Teste ponta a ponta contra um PostgreSQL real.
// Rode com: TEST_DATABASE_URL=postgresql://... npm test
// (o banco é LIMPO a cada execução — nunca aponte para produção)
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { addDays, toDateOnly, todayInTimeZone } from '../src/lib/dates.js';

const DB = process.env.TEST_DATABASE_URL;
const skip = DB ? false : 'defina TEST_DATABASE_URL para rodar a integração';

let request, app, prisma, runExpiryCheck, flushPendingAlerts, setNotifier, NotifierUnavailableError;
const sent = [];

/** Notificador falso com o contrato completo dos providers. */
const fakeNotifier = ({ ready = true, qr = null, send = async (msg) => void sent.push(msg), restart = async () => {} } = {}) => ({
  name: 'fake',
  channel: 'WHATSAPP',
  start: async () => {},
  stop: async () => {},
  isReady: () => ready,
  onReady: () => () => {},
  status: () => ({ provider: 'fake', state: ready ? 'open' : qr ? 'waiting_qr' : 'reconnecting', me: ready ? '5511900000000@s.whatsapp.net' : null }),
  getQr: () => (qr ? { qr, generatedAt: new Date() } : null),
  restart,
  send,
});

before(async () => {
  if (!DB) return;
  Object.assign(process.env, {
    DATABASE_URL: DB,
    JWT_SECRET: 'test-secret-com-mais-de-16-chars',
    CRON_ENABLED: 'false',
    WHATSAPP_ADMIN_EMAILS: 'Ana@Example.com',
    NODE_ENV: 'test',
  });
  ({ default: request } = await import('supertest'));
  ({ prisma } = await import('../src/lib/prisma.js'));
  ({ runExpiryCheck, flushPendingAlerts } = await import('../src/modules/alerts/alerts.service.js'));
  ({ NotifierUnavailableError } = await import('../src/notifications/errors.js'));
  ({ setNotifier } = await import('../src/notifications/index.js'));
  app = (await import('../src/app.js')).createApp();

  setNotifier(fakeNotifier());
  await prisma.$executeRawUnsafe('TRUNCATE stores, users, products, batches, expiry_alerts CASCADE');
});

after(async () => {
  await prisma?.$disconnect();
});

const day = (n) => toDateOnly(addDays(todayInTimeZone('America/Sao_Paulo'), n));
const waitFor = async (fn, ms = 2000) => {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await fn()) return;
    await new Promise((r) => setTimeout(r, 25));
  }
  throw new Error('timeout');
};

test('fluxo completo: cadastro, entrada rápida, semáforo e alertas', { skip }, async () => {
  // --- Onboarding
  const reg = await request(app).post('/api/auth/register').send({
    storeName: 'Mercadinho da Esquina',
    whatsappPhone: '+5511999998888',
    name: 'Dona Maria',
    email: 'maria@example.com',
    password: 'senha-forte',
  });
  assert.equal(reg.status, 201, JSON.stringify(reg.body));
  const owner = { Authorization: `Bearer ${reg.body.token}` };

  const op = await request(app)
    .post('/api/users')
    .set(owner)
    .send({ name: 'João Caixa', email: 'joao@example.com', password: 'senha-forte' });
  assert.equal(op.status, 201);
  const login = await request(app).post('/api/auth/login').send({ email: 'joao@example.com', password: 'senha-forte' });
  const operator = { Authorization: `Bearer ${login.body.token}` };

  // --- Entrada rápida: produto desconhecido -> 422 pedindo mini-cadastro
  const unknown = await request(app)
    .post('/api/batches')
    .set(operator)
    .send({ barcode: '7891000100103', expiryDate: day(40), quantity: 12 });
  assert.equal(unknown.status, 422);
  assert.equal(unknown.body.error.code, 'PRODUCT_NOT_FOUND');

  // Verde (sem custo -> fallback para preço)
  const green = await request(app)
    .post('/api/batches')
    .set(operator)
    .send({ barcode: '7891000100103', expiryDate: day(40), quantity: 12, product: { name: 'Leite Condensado', price: 6.5 } });
  assert.equal(green.status, 201);
  assert.equal(green.body.productCreated, true);
  assert.equal(green.body.batch.semaphore, 'green');
  assert.equal(green.body.batch.riskBasis, 'price');

  // Mesmo produto + mesma validade => soma no lote existente
  const merged = await request(app)
    .post('/api/batches')
    .set(operator)
    .send({ barcode: '7891000100103', expiryDate: day(40), quantity: 3 });
  assert.equal(merged.status, 200);
  assert.equal(merged.body.merged, true);
  assert.equal(merged.body.batch.quantity, 15);

  // Amarelo
  await request(app)
    .post('/api/products')
    .set(owner)
    .send({ barcode: '7894900011517', name: 'Iogurte Natural', price: 4.99, costPrice: 2.1 })
    .expect(201);
  const yellow = await request(app)
    .post('/api/batches')
    .set(operator)
    .send({ barcode: '7894900011517', expiryDate: day(20), quantity: 10 });
  assert.equal(yellow.body.batch.semaphore, 'yellow');

  // Vermelho (custo cadastrado) -> dispara alerta imediato
  const red = await request(app)
    .post('/api/batches')
    .set(operator)
    .send({ barcode: '7894900011517', expiryDate: day(5), quantity: 8 });
  assert.equal(red.status, 201);
  assert.equal(red.body.batch.semaphore, 'red');
  assert.equal(red.body.batch.riskBasis, 'cost');
  assert.equal(red.body.batch.valueAtRisk, 16.8); // 8 x 2,10

  await waitFor(async () => (await prisma.expiryAlert.count({ where: { status: 'SENT' } })) === 1);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].to, '+5511999998888');
  assert.match(sent[0].message, /Iogurte Natural/);
  assert.match(sent[0].message, /30% OFF/);

  // Vencido (registrado com atraso), sem custo
  await request(app)
    .post('/api/batches')
    .set(operator)
    .send({ barcode: '7890000000001', expiryDate: day(-2), quantity: 4, product: { name: 'Pão de Forma', price: 8 } })
    .expect(201);

  // --- Dashboard (só dono)
  await request(app).get('/api/dashboard/summary').set(operator).expect(403);
  const dash = await request(app).get('/api/dashboard/summary').set(owner);
  assert.equal(dash.status, 200);
  assert.equal(dash.body.zones.green.batches, 1);
  assert.equal(dash.body.zones.yellow.batches, 1);
  assert.equal(dash.body.zones.red.batches, 2);
  assert.equal(dash.body.zones.red.expired.batches, 1);
  assert.equal(dash.body.valueAtRisk, 48.8); // 16,80 (custo) + 4 x 8,00 (fallback preço)
  // Lista de ação: amarelos + vermelhos, ordenada por validade, com preço atual para a promoção
  assert.deepEqual(dash.body.actionItems.map((b) => b.semaphore), ['red', 'red', 'yellow']);
  assert.equal(dash.body.actionItems[0].product.name, 'Pão de Forma');
  assert.equal(dash.body.actionItems[1].product.price, 4.99);
  assert.equal(dash.body.actionItemsTotal, 3);
  assert.equal(dash.body.promo.suggestedDiscountPct, 30);

  // --- Filtros do CRUD
  const reds = await request(app).get('/api/batches?semaphore=red').set(operator);
  assert.equal(reds.body.total, 2);
  const yellows = await request(app).get('/api/batches?semaphore=yellow').set(operator);
  assert.equal(yellows.body.total, 1);

  // --- Cron: idempotente
  await waitFor(async () => (await prisma.expiryAlert.count({ where: { status: 'SENT' } })) === 2);
  const [first] = await runExpiryCheck();
  assert.equal(first.created, 0); // tudo já foi alertado na entrada
  const [second] = await runExpiryCheck();
  assert.equal(second.created, 0);
  assert.equal(await prisma.expiryAlert.count(), 2);
  assert.equal(sent.length, 2);

  // Cron "daqui a 16 dias": o amarelo vira vermelho e o vermelho vira vencido
  const future = new Date(Date.now() + 16 * 24 * 3600 * 1000);
  const [later] = await runExpiryCheck({ now: future });
  assert.equal(later.created, 2);
  assert.equal(later.sent, 2);

  // --- Baixa total encerra o lote e ele sai do semáforo
  const patched = await request(app).patch(`/api/batches/${red.body.batch.id}`).set(operator).send({ quantity: 0 });
  assert.equal(patched.body.status, 'SOLD_OUT');
  const dash2 = await request(app).get('/api/dashboard/summary').set(owner);
  assert.equal(dash2.body.zones.red.batches, 1);

  // --- Falha de envio é registrada e re-tentada
  setNotifier(fakeNotifier({ send: async () => { throw new Error('erro do provedor'); } }));
  await request(app)
    .post('/api/batches')
    .set(operator)
    .send({ barcode: '7894900011517', expiryDate: day(1), quantity: 2 })
    .expect(201);
  await waitFor(async () => (await prisma.expiryAlert.count({ where: { status: 'FAILED' } })) === 1);
  setNotifier(fakeNotifier());
  const [retry] = await runExpiryCheck();
  assert.equal(retry.sent, 1);
  const alerts = await request(app).get('/api/alerts?status=FAILED').set(owner);
  assert.equal(alerts.body.total, 0);

  // --- Isolamento entre lojas
  const other = await request(app).post('/api/auth/register').send({
    storeName: 'Pet Shop', name: 'Carlos', email: 'carlos@example.com', password: 'senha-forte',
  });
  const otherAuth = { Authorization: `Bearer ${other.body.token}` };
  await request(app).get(`/api/batches/${red.body.batch.id}`).set(otherAuth).expect(404);
  const otherList = await request(app).get('/api/batches').set(otherAuth);
  assert.equal(otherList.body.total, 0);
});

test('WhatsApp offline: alertas esperam sem gastar tentativa e saem na reconexão', { skip }, async () => {
  const reg = await request(app).post('/api/auth/register').send({
    storeName: 'Farmácia Central', whatsappPhone: '+5511988887777', name: 'Ana', email: 'ana@example.com', password: 'senha-forte',
  });
  const auth = { Authorization: `Bearer ${reg.body.token}` };
  const storeId = reg.body.store.id;
  const alertsOf = () => prisma.expiryAlert.findMany({ where: { storeId }, orderBy: { createdAt: 'asc' } });

  // 1) Canal desconectado (ex: aguardando QR) no momento do cron
  setNotifier(fakeNotifier({ ready: false }));
  await request(app).post('/api/batches').set(auth)
    .send({ barcode: '7896004000015', expiryDate: day(3), quantity: 20, product: { name: 'Dipirona 500mg', price: 12.9, costPrice: 5.4 } })
    .expect(201);
  await new Promise((r) => setTimeout(r, 200)); // alerta imediato roda em segundo plano
  const [cron] = await runExpiryCheck({ storeId });
  assert.equal(cron.waiting, 1);
  let [alert] = await alertsOf();
  assert.equal(alert.status, 'PENDING');
  assert.equal(alert.attempts, 0, 'canal offline não consome tentativa');
  assert.equal(alert.channel, 'WHATSAPP');

  // 2) Caiu no meio do envio: devolve a tentativa
  setNotifier(fakeNotifier({ send: async () => { throw new NotifierUnavailableError('caiu'); } }));
  const [mid] = await runExpiryCheck({ storeId });
  assert.equal(mid.waiting, 1);
  [alert] = await alertsOf();
  assert.equal(alert.status, 'PENDING');
  assert.equal(alert.attempts, 0);

  // 3) Reconectou: o flush envia o pendente
  const delivered = [];
  setNotifier(fakeNotifier({ send: async (msg) => void delivered.push(msg) }));
  const flushed = await flushPendingAlerts();
  assert.equal(flushed.find((r) => r.storeId === storeId).sent, 1);
  [alert] = await alertsOf();
  assert.equal(alert.status, 'SENT');
  assert.equal(delivered[0].to, '+5511988887777');
  assert.match(delivered[0].message, /Dipirona 500mg/);

  // 4) Endpoint de diagnóstico e de mensagem de teste
  const status = await request(app).get('/api/notifications/status').set(auth);
  assert.equal(status.body.state, 'open');
  const ping = await request(app).post('/api/notifications/test').set(auth);
  assert.equal(ping.status, 200);
  assert.match(delivered[1].message, /Tudo certo/);

  setNotifier(fakeNotifier({ ready: false, send: async () => { throw new NotifierUnavailableError('aguardando QR'); } }));
  const down = await request(app).post('/api/notifications/test').set(auth);
  assert.equal(down.status, 503);
  assert.equal(down.body.error.code, 'NOTIFIER_UNAVAILABLE');
});

test('painel: status para todo dono; QR e reconexão só para WHATSAPP_ADMIN_EMAILS', { skip }, async () => {
  const login = (email) => request(app).post('/api/auth/login').send({ email, password: 'senha-forte' });
  const admin = { Authorization: `Bearer ${(await login('ana@example.com')).body.token}` }; // e-mail com caixa diferente
  const other = await request(app).post('/api/auth/register').send({
    storeName: 'Loja Curiosa', name: 'Zé', email: 'ze@example.com', password: 'senha-forte',
  });
  const owner = { Authorization: `Bearer ${other.body.token}` };
  await request(app).post('/api/users').set(owner).send({ name: 'Caixa', email: 'caixa@example.com', password: 'senha-forte' });
  const operator = { Authorization: `Bearer ${(await login('caixa@example.com')).body.token}` };

  let restarts = 0;
  setNotifier(fakeNotifier({ ready: false, qr: '2@abc,def,ghi', restart: async () => void (restarts += 1) }));

  const st = await request(app).get('/api/notifications/status').set(owner);
  assert.equal(st.status, 200);
  assert.equal(st.body.state, 'waiting_qr');
  assert.equal(st.body.canManage, false);
  assert.equal(st.body.me, undefined, 'número remetente não vaza para outras lojas');
  await request(app).get('/api/notifications/status').set(operator).expect(403);

  await request(app).get('/api/notifications/whatsapp/qr').set(owner).expect(403);
  await request(app).post('/api/notifications/whatsapp/reconnect').set(owner).expect(403);
  assert.equal(restarts, 0);

  const qr = await request(app).get('/api/notifications/whatsapp/qr').set(admin);
  assert.equal(qr.status, 200);
  assert.equal(qr.body.canManage, true);
  assert.match(qr.body.qr, /^data:image\/png;base64,/);
  assert.equal(qr.headers['cache-control'], 'no-store');

  await request(app).post('/api/notifications/whatsapp/reconnect').set(admin).expect(200);
  assert.equal(restarts, 1);

  setNotifier(fakeNotifier());
  const done = await request(app).get('/api/notifications/whatsapp/qr').set(admin);
  assert.equal(done.body.state, 'open');
  assert.equal(done.body.qr, null);
  assert.equal(done.body.me, '5511900000000@s.whatsapp.net');
});
