// Teste ponta a ponta contra um PostgreSQL real.
// Rode com: TEST_DATABASE_URL=postgresql://... npm test
// (o banco é LIMPO a cada execução — nunca aponte para produção)
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';

const DB = process.env.TEST_DATABASE_URL;
const skip = DB ? false : 'defina TEST_DATABASE_URL para rodar a integração';

let request, app, prisma, setNotifier;

/** Notificador falso com o contrato completo dos providers. */
const fakeNotifier = ({ ready = true, qr = null } = {}) => ({
  name: 'fake',
  channel: 'WHATSAPP',
  start: async () => {},
  stop: async () => {},
  isReady: () => ready,
  onReady: () => () => {},
  status: () => ({ provider: 'fake', state: ready ? 'open' : qr ? 'waiting_qr' : 'reconnecting', me: ready ? '5511900000000@s.whatsapp.net' : null }),
  getQr: () => (qr ? { qr, generatedAt: new Date() } : null),
  restart: async () => {},
  send: async () => ({ id: 'x' }),
});

before(async () => {
  if (!DB) return;
  Object.assign(process.env, {
    DATABASE_URL: DB,
    JWT_SECRET: 'test-secret-com-mais-de-16-chars',
    WHATSAPP_ADMIN_EMAILS: 'Admin@Example.com',
    NODE_ENV: 'test',
  });
  ({ default: request } = await import('supertest'));
  ({ prisma } = await import('../src/lib/prisma.js'));
  ({ setNotifier } = await import('../src/notifications/index.js'));
  app = (await import('../src/app.js')).createApp();
  setNotifier(fakeNotifier());
  await prisma.$executeRawUnsafe('TRUNCATE users, clients, quotes, quote_items CASCADE');
});

after(async () => {
  await prisma?.$disconnect();
});

async function signUp(email, name = 'Carlos Eletricista') {
  const res = await request(app).post('/api/auth/register').send({ name, email, password: 'senha-forte' });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  return { Authorization: `Bearer ${res.body.token}` };
}

test('cadastro, login e /me', { skip }, async () => {
  await signUp('carlos@example.com');
  await request(app).post('/api/auth/register').send({ name: 'Outro', email: 'carlos@example.com', password: 'senha-forte' }).expect(409);
  await request(app).post('/api/auth/login').send({ email: 'carlos@example.com', password: 'errada' }).expect(401);
  const login = await request(app).post('/api/auth/login').send({ email: 'CARLOS@example.com', password: 'senha-forte' });
  assert.equal(login.status, 200);
  const me = await request(app).get('/api/auth/me').set({ Authorization: `Bearer ${login.body.token}` });
  assert.equal(me.body.user.name, 'Carlos Eletricista');
  await request(app).get('/api/quotes').expect(401);
});

test('dashboard vazio para conta nova (frontend não quebra)', { skip }, async () => {
  const auth = await signUp('novo@example.com');
  const res = await request(app).get('/api/quotes/summary').set(auth);
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, {
    approvedThisMonth: { count: 0, amount: 0 },
    pending: { count: 0, amount: 0 },
    closeRate: { rate: null, approved: 0, answered: 0 },
    recent: [],
  });
  assert.deepEqual((await request(app).get('/api/clients').set(auth)).body.items, []);
});

test('clientes e orçamentos: CRUD, total calculado no servidor e resumo', { skip }, async () => {
  const auth = await signUp('ana@example.com', 'Ana Encanadora');

  // --- Clientes
  const mariana = await request(app).post('/api/clients').set(auth)
    .send({ name: 'Mariana Souza', phone: '+5511991112222', address: 'Rua das Flores, 120' });
  assert.equal(mariana.status, 201);
  const roberto = (await request(app).post('/api/clients').set(auth).send({ name: 'Roberto Lima' })).body;
  await request(app).post('/api/clients').set(auth).send({ name: 'X' }).expect(400);
  const list = await request(app).get('/api/clients?search=mari').set(auth);
  assert.deepEqual(list.body.items.map((c) => c.name), ['Mariana Souza']);
  const patched = await request(app).patch(`/api/clients/${roberto.id}`).set(auth).send({ phone: '+5511995556666' });
  assert.equal(patched.body.phone, '+5511995556666');

  // --- Orçamentos (total = soma de quantidade × preço, em centavos)
  const q1 = await request(app).post('/api/quotes').set(auth).send({
    clientId: mariana.body.id,
    expiresAt: '2026-12-31',
    items: [
      { description: 'Instalação de chuveiro', unitPrice: 180 },
      { description: 'Fio 10mm (m)', quantity: 2.5, unitPrice: 14.9 },
    ],
  });
  assert.equal(q1.status, 201, JSON.stringify(q1.body));
  assert.equal(q1.body.status, 'PENDING');
  assert.equal(q1.body.totalAmount, 217.25); // 180 + 2,5 × 14,90
  assert.equal(q1.body.items[1].total, 37.25);
  assert.equal(q1.body.expiresAt, '2026-12-31');
  await request(app).post('/api/quotes').set(auth).send({ clientId: mariana.body.id, items: [] }).expect(400);

  const q2 = (await request(app).post('/api/quotes').set(auth)
    .send({ clientId: roberto.id, items: [{ description: 'Desentupimento', unitPrice: 320 }] })).body;
  const q3 = (await request(app).post('/api/quotes').set(auth)
    .send({ clientId: roberto.id, items: [{ description: 'Troca de registro', unitPrice: 150 }] })).body;

  // Aprovar registra a data da resposta; trocar itens recalcula o total
  const approved = await request(app).patch(`/api/quotes/${q2.id}`).set(auth).send({ status: 'APPROVED' });
  assert.equal(approved.body.status, 'APPROVED');
  assert.ok(approved.body.respondedAt);
  await request(app).patch(`/api/quotes/${q3.id}`).set(auth).send({ status: 'REJECTED' }).expect(200);
  const edited = await request(app).patch(`/api/quotes/${q1.body.id}`).set(auth)
    .send({ items: [{ description: 'Instalação de chuveiro', unitPrice: 200 }] });
  assert.equal(edited.status, 200, JSON.stringify(edited.body));
  assert.equal(edited.body.totalAmount, 200);
  assert.equal(edited.body.items.length, 1);

  // --- Resumo do Dashboard
  const summary = (await request(app).get('/api/quotes/summary').set(auth)).body;
  assert.deepEqual(summary.approvedThisMonth, { count: 1, amount: 320 });
  assert.deepEqual(summary.pending, { count: 1, amount: 200 });
  assert.deepEqual(summary.closeRate, { rate: 0.5, approved: 1, answered: 2 });
  assert.deepEqual(summary.recent.map((q) => q.client.name), ['Roberto Lima', 'Roberto Lima', 'Mariana Souza']);

  const pendings = await request(app).get('/api/quotes?status=PENDING').set(auth);
  assert.equal(pendings.body.total, 1);

  // Cliente com orçamento não é apagado (preserva o histórico); orçamento sim
  await request(app).delete(`/api/clients/${roberto.id}`).set(auth).expect(409);
  await request(app).delete(`/api/quotes/${q3.id}`).set(auth).expect(204);
  await request(app).get(`/api/quotes/${q3.id}`).set(auth).expect(404);

  // --- Isolamento entre prestadores
  const other = await signUp('outro@example.com', 'Outro Prestador');
  await request(app).get(`/api/quotes/${q1.body.id}`).set(other).expect(404);
  await request(app).get(`/api/clients/${roberto.id}`).set(other).expect(404);
  await request(app).post('/api/quotes').set(other)
    .send({ clientId: roberto.id, items: [{ description: 'Invasão', unitPrice: 1 }] }).expect(404);
  assert.equal((await request(app).get('/api/quotes').set(other)).body.total, 0);
});

test('cobrança (condições + PIX) e status manual pelo prestador', { skip }, async () => {
  const auth = await signUp('cobranca@example.com', 'Bruno Marceneiro');
  const client = (await request(app).post('/api/clients').set(auth).send({ name: 'Paula Reis', phone: '+5511912345678' })).body;

  const created = await request(app).post('/api/quotes').set(auth).send({
    clientId: client.id,
    paymentTerms: '  50% de entrada e 50% na entrega  ',
    pixKey: 'bruno@exemplo.com',
    items: [{ description: 'Armário sob medida', unitPrice: 2400 }],
  });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  assert.equal(created.body.paymentTerms, '50% de entrada e 50% na entrega'); // aparado
  assert.equal(created.body.pixKey, 'bruno@exemplo.com');
  const id = created.body.id;

  // Campos opcionais: orçamento sem cobrança continua válido; string vazia apaga
  const plain = await request(app).post('/api/quotes').set(auth).send({ clientId: client.id, items: [{ description: 'Visita', unitPrice: 80 }] });
  assert.equal(plain.body.paymentTerms, null);
  const cleared = await request(app).patch(`/api/quotes/${id}`).set(auth).send({ pixKey: '' });
  assert.equal(cleared.body.pixKey, null);
  assert.equal(cleared.body.paymentTerms, '50% de entrada e 50% na entrega', 'PATCH parcial não apaga o que não foi enviado');

  // PATCH /:id/status — aprovar registra a data; o Dashboard já reflete
  const approved = await request(app).patch(`/api/quotes/${id}/status`).set(auth).send({ status: 'APPROVED' });
  assert.equal(approved.status, 200);
  assert.equal(approved.body.status, 'APPROVED');
  assert.ok(Date.now() - new Date(approved.body.respondedAt).getTime() < 60_000);
  let summary = (await request(app).get('/api/quotes/summary').set(auth)).body;
  assert.deepEqual(summary.approvedThisMonth, { count: 1, amount: 2400 });
  assert.equal(summary.pending.count, 1);

  // Rejeitar e voltar para pendente (limpa a data para não contar nas métricas)
  const rejected = await request(app).patch(`/api/quotes/${id}/status`).set(auth).send({ status: 'REJECTED' });
  assert.equal(rejected.body.status, 'REJECTED');
  assert.ok(rejected.body.respondedAt);
  const reopened = await request(app).patch(`/api/quotes/${id}/status`).set(auth).send({ status: 'PENDING' });
  assert.equal(reopened.body.status, 'PENDING');
  assert.equal(reopened.body.respondedAt, null);
  summary = (await request(app).get('/api/quotes/summary').set(auth)).body;
  assert.equal(summary.pending.count, 2);
  assert.deepEqual(summary.closeRate, { rate: null, approved: 0, answered: 0 });

  await request(app).patch(`/api/quotes/${id}/status`).set(auth).send({ status: 'PAGO' }).expect(400);
  const other = await signUp('intruso@example.com', 'Intruso');
  await request(app).patch(`/api/quotes/${id}/status`).set(other).send({ status: 'APPROVED' }).expect(404);
});

test('WhatsApp: status para todos; QR e reconexão só para WHATSAPP_ADMIN_EMAILS', { skip }, async () => {
  setNotifier(fakeNotifier({ ready: false, qr: '2@fake-qr' }));
  const admin = await signUp('admin@example.com', 'Admin');
  const user = await signUp('comum@example.com', 'Comum');

  const st = await request(app).get('/api/notifications/status').set(user);
  assert.equal(st.body.state, 'waiting_qr');
  assert.equal(st.body.canManage, false);
  await request(app).get('/api/notifications/whatsapp/qr').set(user).expect(403);

  const qr = await request(app).get('/api/notifications/whatsapp/qr').set(admin);
  assert.equal(qr.status, 200);
  assert.match(qr.body.qr, /^data:image\/png;base64,/);
  setNotifier(fakeNotifier());
});
