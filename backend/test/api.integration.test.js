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
  await prisma.$executeRawUnsafe('TRUNCATE stores, users, products, batches, expiry_alerts, daily_reports CASCADE');
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

test('fluxo completo: cadastro, entrada rápida, semáforo e relatório diário', { skip }, async () => {
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
  // Operador não vê dinheiro: custo e valor em risco são do dono
  assert.equal(green.body.batch.valueAtRisk, undefined);
  assert.equal(green.body.batch.unitCost, undefined);

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

  // Vermelho (custo cadastrado): NÃO manda mensagem na hora — vai no relatório da manhã
  const red = await request(app)
    .post('/api/batches')
    .set(operator)
    .send({ barcode: '7894900011517', expiryDate: day(5), quantity: 8 });
  assert.equal(red.status, 201);
  assert.equal(red.body.batch.semaphore, 'red');
  const redAsOwner = await request(app).get(`/api/batches/${red.body.batch.id}`).set(owner);
  assert.equal(redAsOwner.body.riskBasis, 'cost');
  assert.equal(redAsOwner.body.valueAtRisk, 16.8); // 8 x 2,10

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

  // --- Relatório diário: UMA mensagem por loja, com o total em risco
  await new Promise((r) => setTimeout(r, 100));
  assert.equal(sent.length, 0, 'nenhuma mensagem por produto na entrada');
  const [first] = await runExpiryCheck();
  assert.equal(first.created, 1);
  assert.equal(first.sent, 1);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].to, '+5511999998888');
  assert.match(sent[0].message, /Bom dia/);
  assert.match(sent[0].message, /2 produtos\* a vencer ou já vencidos, somando \*R\$ 48,80\*/);
  assert.match(sent[0].message, /Iogurte Natural \(8 un\.\) — vence em 5 dias/);
  assert.match(sent[0].message, /Já venceram[\s\S]*Pão de Forma/);
  assert.doesNotMatch(sent[0].message, /Leite Condensado|12 un/); // verde e amarelo ficam fora

  // Idempotente: o cron pode rodar de novo no mesmo dia sem repetir a mensagem
  const [second] = await runExpiryCheck();
  assert.equal(second.created, 0);
  assert.equal(second.sent, 0);
  assert.equal(await prisma.dailyReport.count(), 1);
  assert.equal(sent.length, 1);

  // Dono pode reenviar o de hoje (botão de teste); operador não
  await request(app).post('/api/alerts/run?resend=1').set(operator).expect(403);
  const resent = await request(app).post('/api/alerts/run?resend=1').set(owner);
  assert.equal(resent.body.sent, 1);
  assert.equal(sent.length, 2);
  assert.equal(await prisma.dailyReport.count(), 1);

  // Cron "daqui a 16 dias": o amarelo vira vermelho e o vermelho vira vencido -> novo relatório (3 itens)
  const future = new Date(Date.now() + 16 * 24 * 3600 * 1000);
  const [later] = await runExpiryCheck({ now: future });
  assert.equal(later.created, 1);
  assert.equal(later.sent, 1);
  assert.match(sent[2].message, /3 produtos/);

  // --- Baixa total encerra o lote e ele sai do semáforo
  const patched = await request(app).patch(`/api/batches/${red.body.batch.id}`).set(operator).send({ quantity: 0 });
  assert.equal(patched.body.status, 'SOLD_OUT');
  const dash2 = await request(app).get('/api/dashboard/summary').set(owner);
  assert.equal(dash2.body.zones.red.batches, 1);

  // --- Falha de envio é registrada e re-tentada no mesmo dia
  const nextDay = new Date(future.getTime() + 24 * 3600 * 1000);
  setNotifier(fakeNotifier({ send: async () => { throw new Error('erro do provedor'); } }));
  const [failed] = await runExpiryCheck({ now: nextDay });
  assert.equal(failed.failed, 1);
  assert.equal((await request(app).get('/api/alerts?status=FAILED').set(owner)).body.total, 1);
  setNotifier(fakeNotifier());
  const [retry] = await runExpiryCheck({ now: nextDay });
  assert.equal(retry.created, 0);
  assert.equal(retry.sent, 1);
  const alerts = await request(app).get('/api/alerts?status=FAILED').set(owner);
  assert.equal(alerts.body.total, 0);
  const history = await request(app).get('/api/alerts').set(owner);
  assert.equal(history.body.total, 3);
  assert.equal(history.body.items[0].status, 'SENT');
  assert.equal(typeof history.body.items[0].valueAtRisk, 'number');

  // --- Isolamento entre lojas
  const other = await request(app).post('/api/auth/register').send({
    storeName: 'Pet Shop', name: 'Carlos', email: 'carlos@example.com', password: 'senha-forte',
  });
  const otherAuth = { Authorization: `Bearer ${other.body.token}` };
  await request(app).get(`/api/batches/${red.body.batch.id}`).set(otherAuth).expect(404);
  const otherList = await request(app).get('/api/batches').set(otherAuth);
  assert.equal(otherList.body.total, 0);
});

test('WhatsApp offline: relatório espera sem gastar tentativa e saem na reconexão', { skip }, async () => {
  const reg = await request(app).post('/api/auth/register').send({
    storeName: 'Farmácia Central', whatsappPhone: '+5511988887777', name: 'Ana', email: 'ana@example.com', password: 'senha-forte',
  });
  const auth = { Authorization: `Bearer ${reg.body.token}` };
  const storeId = reg.body.store.id;
  const alertsOf = () => prisma.dailyReport.findMany({ where: { storeId }, orderBy: { createdAt: 'asc' } });

  // 1) Canal desconectado (ex: aguardando QR) no momento do cron
  setNotifier(fakeNotifier({ ready: false }));
  await request(app).post('/api/batches').set(auth)
    .send({ barcode: '7896004000015', expiryDate: day(3), quantity: 20, product: { name: 'Dipirona 500mg', price: 12.9, costPrice: 5.4 } })
    .expect(201);
  const [cron] = await runExpiryCheck({ storeId });
  assert.equal(cron.created, 1);
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
  assert.match(delivered[0].message, /Bom dia/);
  assert.match(delivered[0].message, /Dipirona 500mg \(20 un\.\)/);
  assert.match(delivered[0].message, /R\$ 108,00/); // 20 x 5,40
  assert.equal(alert.itemsCount, 1);
  assert.equal(Number(alert.valueAtRisk), 108);

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

test('catálogo: listar, buscar, editar e excluir sem perder histórico', { skip }, async () => {
  setNotifier(fakeNotifier());
  const reg = await request(app).post('/api/auth/register').send({
    storeName: 'Empório Catálogo', name: 'Lia', email: 'lia@example.com', password: 'senha-forte',
  });
  const owner = { Authorization: `Bearer ${reg.body.token}` };
  await request(app).post('/api/users').set(owner).send({ name: 'Caixa', email: 'caixa2@example.com', password: 'senha-forte' });
  const op = await request(app).post('/api/auth/login').send({ email: 'caixa2@example.com', password: 'senha-forte' });
  const operator = { Authorization: `Bearer ${op.body.token}` };

  const mk = (barcode, name, price) => request(app).post('/api/products').set(owner).send({ barcode, name, price });
  const arroz = (await mk('7890000000201', 'Arroz 5kg', 27.9)).body;
  const cafe = (await mk('7890000000202', 'Café 500g', 19.9)).body;
  const leite = (await mk('7890000000203', 'Leite 1L', 5.49)).body;
  await mk('7890000000201', 'Duplicado', 1).expect(409); // produto ativo nunca é sobrescrito

  // Café: lote ativo · Leite: só histórico (vendido)
  await request(app).post('/api/batches').set(owner).send({ barcode: cafe.barcode, expiryDate: day(60), quantity: 3 }).expect(201);
  const leiteBatch = await request(app).post('/api/batches').set(owner).send({ barcode: leite.barcode, expiryDate: day(5), quantity: 2 });
  await request(app).patch(`/api/batches/${leiteBatch.body.batch.id}`).set(owner).send({ quantity: 0 }).expect(200);

  // Listagem ordenada por nome, com itens ativos na prateleira
  let list = await request(app).get('/api/products').set(owner);
  assert.deepEqual(list.body.items.map((p) => p.name), ['Arroz 5kg', 'Café 500g', 'Leite 1L']);
  assert.deepEqual(list.body.items.map((p) => p.activeBatches), [0, 1, 0]);
  assert.equal((await request(app).get('/api/products?search=caf').set(owner)).body.items[0].name, 'Café 500g');
  assert.equal((await request(app).get('/api/products?search=CAFE').set(owner)).body.items[0]?.name, 'Café 500g', 'busca ignora acento e caixa');
  assert.equal((await request(app).get('/api/products?search=50%25').set(owner)).body.total, 0, '% é literal, não curinga');
  assert.equal((await request(app).get('/api/products?search=78900000002').set(owner)).body.total, 3);

  // Edição: nome, preço e custo (código de barras não muda)
  const edited = await request(app).patch(`/api/products/${arroz.id}`).set(owner).send({ name: 'Arroz Tipo 1 5kg', price: 29.9, costPrice: 21 });
  assert.equal(edited.status, 200);
  assert.equal(edited.body.name, 'Arroz Tipo 1 5kg');
  assert.equal(edited.body.price, 29.9);
  assert.equal(edited.body.costPrice, 21);
  await request(app).patch(`/api/products/${arroz.id}`).set(owner).send({ barcode: '7890000000999' }).expect(400);
  // Operador: vê o catálogo sem custo, corrige nome/categoria, mas não mexe em preço nem exclui
  await request(app).patch(`/api/products/${arroz.id}`).set(operator).send({ price: 1 }).expect(403);
  await request(app).patch(`/api/products/${arroz.id}`).set(operator).send({ name: 'Arroz', costPrice: 1 }).expect(403);
  await request(app).delete(`/api/products/${arroz.id}`).set(operator).expect(403);
  const opList = await request(app).get('/api/products').set(operator);
  assert.equal(opList.status, 200);
  assert.equal(opList.body.items[0].price, 29.9);
  assert.equal('costPrice' in opList.body.items[0], false);
  const renamed = await request(app).patch(`/api/products/${arroz.id}`).set(operator).send({ name: 'Arroz Tipo 1 (5kg)', category: 'FOOD' });
  assert.equal(renamed.status, 200);
  assert.equal(renamed.body.name, 'Arroz Tipo 1 (5kg)');
  assert.equal(renamed.body.costPrice, undefined);
  assert.equal((await request(app).get(`/api/products/${arroz.id}`).set(owner)).body.costPrice, 21);

  // Exclusão nunca quebra: com estoque ativo arquiva (o item continua no painel até a baixa)
  const withStock = await request(app).delete(`/api/products/${cafe.id}`).set(owner);
  assert.equal(withStock.status, 200);
  assert.deepEqual(withStock.body, { archived: true, onShelf: 1 });
  const dash = await request(app).get('/api/dashboard/summary').set(owner);
  assert.equal(dash.body.zones.green.batches, 1, 'item na prateleira continua contado no painel');

  const archived = await request(app).delete(`/api/products/${leite.id}`).set(owner);
  assert.deepEqual(archived.body, { archived: true, onShelf: 0 });
  assert.equal(await prisma.batch.count({ where: { productId: leite.id } }), 1, 'histórico preservado');

  const removed = await request(app).delete(`/api/products/${arroz.id}`).set(owner);
  assert.deepEqual(removed.body, { archived: false, onShelf: 0 });
  assert.equal(await prisma.product.count({ where: { id: arroz.id } }), 0);

  list = await request(app).get('/api/products').set(owner);
  assert.deepEqual(list.body.items.map((p) => p.name), [], 'excluídos somem do catálogo');
  await request(app).get(`/api/products/barcode/${leite.barcode}`).set(owner).expect(404);
  await request(app).patch(`/api/products/${leite.id}`).set(owner).send({ price: 1 }).expect(404);

  // Ler o código do produto arquivado de novo: pede mini-cadastro e reativa o mesmo registro
  const again = await request(app).post('/api/batches').set(operator).send({ barcode: leite.barcode, expiryDate: day(20), quantity: 6 });
  assert.equal(again.status, 422);
  const revived = await request(app).post('/api/batches').set(operator)
    .send({ barcode: leite.barcode, expiryDate: day(20), quantity: 6, product: { name: 'Leite Integral 1L', price: 5.99 } });
  assert.equal(revived.status, 201);
  assert.equal(revived.body.productCreated, true);
  assert.equal(revived.body.batch.productId, leite.id, 'mesmo produto, histórico continua ligado');
  list = await request(app).get('/api/products').set(owner);
  assert.deepEqual(list.body.items.map((p) => p.name), ['Leite Integral 1L']);
});

test('categoria e foto tirada no celular', { skip }, async () => {
  setNotifier(fakeNotifier());
  const reg = await request(app).post('/api/auth/register').send({
    storeName: 'Pet & Cia', name: 'Rui', email: 'rui@example.com', password: 'senha-forte',
  });
  const owner = { Authorization: `Bearer ${reg.body.token}` };
  const other = await request(app).post('/api/auth/register').send({
    storeName: 'Outra Loja', name: 'Bia', email: 'bia@example.com', password: 'senha-forte',
  });
  const stranger = { Authorization: `Bearer ${other.body.token}` };

  // Categoria: padrão "Outros", aceita só as 5 opções, aparece no lote e no painel
  const semCat = await request(app).post('/api/products').set(owner).send({ barcode: '7890000000501', name: 'Item', price: 2 });
  assert.equal(semCat.body.category, 'OTHER');
  await request(app).post('/api/products').set(owner).send({ barcode: '7890000000502', name: 'X', price: 2, category: 'PHARMACY' }).expect(400);
  const entry = await request(app).post('/api/batches').set(owner)
    .send({ barcode: '7890000000503', expiryDate: day(3), quantity: 4, product: { name: 'Ração Gato 1kg', price: 30, category: 'PETS' } });
  assert.equal(entry.status, 201);
  assert.equal(entry.body.batch.product.category, 'PETS');
  assert.equal(entry.body.batch.product.photoVersion, null);
  const productId = entry.body.batch.productId;
  const edited = await request(app).patch(`/api/products/${semCat.body.id}`).set(owner).send({ category: 'CLEANING' });
  assert.equal(edited.body.category, 'CLEANING');

  // Foto: JPEG real (bytes mágicos), versão muda, servida em rota pública com cache e CORP liberado
  const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(200, 7), Buffer.from([0xff, 0xd9])]);
  const up = await request(app).put(`/api/products/${productId}/photo`).set(owner).set('Content-Type', 'image/jpeg').send(jpeg);
  assert.equal(up.status, 200, JSON.stringify(up.body));
  assert.ok(up.body.photoVersion > 0);
  const img = await request(app).get(`/api/public/product-photos/${productId}?v=${up.body.photoVersion}`).buffer(true);
  assert.equal(img.status, 200);
  assert.equal(img.headers['content-type'], 'image/jpeg');
  assert.equal(img.headers['cross-origin-resource-policy'], 'cross-origin');
  assert.match(img.headers['cache-control'], /immutable/);
  assert.ok(Buffer.from(img.body).equals(jpeg), 'devolve exatamente os bytes enviados');

  const dash = await request(app).get('/api/dashboard/summary').set(owner);
  assert.equal(dash.body.actionItems[0].product.photoVersion, up.body.photoVersion, 'painel recebe a versão da foto');
  assert.equal(dash.body.actionItems[0].product.category, 'PETS');

  // Rejeições: tipo falso, sem corpo, grande demais, produto de outra loja
  const fake = await request(app).put(`/api/products/${productId}/photo`).set(owner).set('Content-Type', 'image/jpeg').send(Buffer.from('<svg onload=alert(1)>'));
  assert.equal(fake.status, 415);
  await request(app).put(`/api/products/${productId}/photo`).set(owner).set('Content-Type', 'text/plain').send('oi').expect(415);
  const big = await request(app).put(`/api/products/${productId}/photo`).set(owner).set('Content-Type', 'image/jpeg').send(Buffer.alloc(2 * 1024 * 1024, 1));
  assert.equal(big.status, 413);
  await request(app).put(`/api/products/${productId}/photo`).set(stranger).set('Content-Type', 'image/jpeg').send(jpeg).expect(404);

  // Remover foto volta para o ícone; produto apagado leva a foto junto (cascade)
  await request(app).delete(`/api/products/${productId}/photo`).set(owner).expect(204);
  await request(app).get(`/api/public/product-photos/${productId}`).expect(404);
  await request(app).put(`/api/products/${semCat.body.id}/photo`).set(owner).set('Content-Type', 'image/jpeg').send(jpeg).expect(200);
  await request(app).delete(`/api/products/${semCat.body.id}`).set(owner).expect(200);
  assert.equal(await prisma.productPhoto.count({ where: { productId: semCat.body.id } }), 0);
});
