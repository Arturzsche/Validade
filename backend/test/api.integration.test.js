// Teste ponta a ponta contra um PostgreSQL real.
// Rode com: TEST_DATABASE_URL=postgresql://... npm test
// (o banco é LIMPO a cada execução — nunca aponte para produção)
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { addDays, toDateOnly, todayInTimeZone } from '../src/lib/dates.js';

const DB = process.env.TEST_DATABASE_URL;
const skip = DB ? false : 'defina TEST_DATABASE_URL para rodar a integração';

let request, app, prisma, runExpiryCheck, setNotifier;
const sent = [];

before(async () => {
  if (!DB) return;
  Object.assign(process.env, {
    DATABASE_URL: DB,
    JWT_SECRET: 'test-secret-com-mais-de-16-chars',
    CRON_ENABLED: 'false',
    NODE_ENV: 'test',
  });
  ({ default: request } = await import('supertest'));
  ({ prisma } = await import('../src/lib/prisma.js'));
  ({ runExpiryCheck } = await import('../src/modules/alerts/alerts.service.js'));
  ({ setNotifier } = await import('../src/notifications/index.js'));
  app = (await import('../src/app.js')).createApp();

  setNotifier({ channel: 'CONSOLE', send: async (msg) => void sent.push(msg) });
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
  setNotifier({ channel: 'CONSOLE', send: async () => { throw new Error('provedor fora do ar'); } });
  await request(app)
    .post('/api/batches')
    .set(operator)
    .send({ barcode: '7894900011517', expiryDate: day(1), quantity: 2 })
    .expect(201);
  await waitFor(async () => (await prisma.expiryAlert.count({ where: { status: 'FAILED' } })) === 1);
  setNotifier({ channel: 'CONSOLE', send: async (msg) => void sent.push(msg) });
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
