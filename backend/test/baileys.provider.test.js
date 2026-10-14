// Testa o ciclo de vida do provider WhatsApp com um socket falso (sem rede):
// QR, conexão, reconexão com backoff, logout, sessão substituída, fila e envio.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DisconnectReason } from 'baileys';
import { createBaileysProvider } from '../src/notifications/providers/baileys.provider.js';
import { NotifierUnavailableError, RecipientError } from '../src/notifications/errors.js';

const silent = { info() {}, warn() {}, error() {} };

function fakeSockets() {
  const sockets = [];
  const make = (config) => {
    const handlers = {};
    const s = {
      config,
      createdAt: Date.now(),
      user: { id: '5511900000000:7@s.whatsapp.net' },
      ev: { on: (event, fn) => (handlers[event] ??= []).push(fn) },
      emit: (event, data) => (handlers[event] ?? []).forEach((fn) => fn(data)),
      lookups: 0,
      async onWhatsApp(number) {
        s.lookups += 1;
        return [{ jid: `${number}@s.whatsapp.net`, exists: !number.endsWith('0000') }];
      },
      sent: [],
      async sendMessage(jid, content) {
        s.sent.push({ jid, content, at: Date.now() });
        return { key: { id: `MSG${s.sent.length}` } };
      },
      ended: false,
      async end() {
        s.ended = true;
      },
    };
    sockets.push(s);
    return s;
  };
  return { make, sockets, last: () => sockets.at(-1) };
}

const closeWith = (statusCode) => ({
  connection: 'close',
  lastDisconnect: { error: Object.assign(new Error(`closed ${statusCode}`), { output: { statusCode } }) },
});

async function waitFor(cond, ms = 1000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (cond()) return;
    await new Promise((r) => setTimeout(r, 5));
  }
  throw new Error('timeout esperando condição');
}

function setup(overrides = {}) {
  const fake = fakeSockets();
  const qrs = [];
  const cleared = [];
  const provider = createBaileysProvider({
    authDir: '/tmp/fake-session',
    sendIntervalMs: 60,
    reconnect: { baseMs: 10, maxMs: 40 },
    log: silent,
    makeSocket: fake.make,
    loadAuthState: async () => ({ state: { creds: {} }, saveCreds: () => {} }),
    fetchVersion: async () => ({ version: [2, 3000, 1], isLatest: true }),
    clearAuthState: async (dir) => void cleared.push(dir),
    printQr: (qr) => qrs.push(qr),
    ...overrides,
  });
  return { provider, fake, qrs, cleared };
}

test('imprime o QR no terminal e fica pronto ao conectar', async () => {
  const { provider, fake, qrs } = setup();
  let readyCalls = 0;
  provider.onReady(() => void (readyCalls += 1));
  await provider.start();

  assert.deepEqual(fake.last().config.version, [2, 3000, 1]);
  assert.equal(fake.last().config.markOnlineOnConnect, false);
  assert.equal(fake.last().config.shouldSyncHistoryMessage, undefined, 'sync inicial precisa ficar ligado (mapeamentos LID)');

  fake.last().emit('connection.update', { qr: 'QR-123' });
  assert.deepEqual(qrs, ['QR-123']);
  assert.equal(provider.status().state, 'waiting_qr');
  assert.equal(provider.isReady(), false);

  fake.last().emit('connection.update', { connection: 'open' });
  assert.equal(provider.isReady(), true);
  assert.equal(provider.status().me, '5511900000000:7@s.whatsapp.net');
  await waitFor(() => readyCalls === 1);
  await provider.stop();
});

test('queda de conexão: reconecta sozinho com backoff crescente e zera ao reconectar', async () => {
  const { provider, fake } = setup();
  await provider.start();
  fake.last().emit('connection.update', { connection: 'open' });

  for (let i = 1; i <= 3; i++) {
    fake.last().emit('connection.update', closeWith(DisconnectReason.connectionLost));
    assert.equal(provider.isReady(), false);
    await waitFor(() => fake.sockets.length === i + 1);
  }
  const gaps = fake.sockets.slice(1).map((s, i) => s.createdAt - fake.sockets[i].createdAt);
  assert.equal(provider.status().reconnectAttempts, 3);
  assert.ok(gaps[2] >= 35, `3ª espera deveria ser ~40ms, foi ${gaps[2]}ms`);

  fake.last().emit('connection.update', { connection: 'open' });
  assert.equal(provider.isReady(), true);
  assert.equal(provider.status().reconnectAttempts, 0);
  await provider.stop();
});

test('restartRequired (logo após escanear o QR) reconecta imediatamente', async () => {
  const { provider, fake } = setup({ reconnect: { baseMs: 5000, maxMs: 5000 } });
  await provider.start();
  fake.last().emit('connection.update', closeWith(DisconnectReason.restartRequired));
  await waitFor(() => fake.sockets.length === 2, 300);
  await provider.stop();
});

test('logout pelo celular apaga a sessão salva e gera um QR novo', async () => {
  const { provider, fake, cleared, qrs } = setup();
  await provider.start();
  fake.last().emit('connection.update', { connection: 'open' });
  fake.last().emit('connection.update', closeWith(DisconnectReason.loggedOut));
  await waitFor(() => fake.sockets.length === 2);
  assert.deepEqual(cleared, ['/tmp/fake-session']);
  fake.last().emit('connection.update', { qr: 'QR-NOVO' });
  assert.deepEqual(qrs, ['QR-NOVO']);
  await provider.stop();
});

test('sessão aberta em outra instância: não reconecta (evita disputa em loop)', async () => {
  const { provider, fake } = setup();
  await provider.start();
  fake.last().emit('connection.update', { connection: 'open' });
  fake.last().emit('connection.update', closeWith(DisconnectReason.connectionReplaced));
  await new Promise((r) => setTimeout(r, 80));
  assert.equal(fake.sockets.length, 1);
  assert.equal(provider.status().state, 'replaced');
  await provider.stop();
});

test('eventos atrasados de um socket antigo são ignorados', async () => {
  const { provider, fake } = setup();
  await provider.start();
  const old = fake.last();
  old.emit('connection.update', closeWith(DisconnectReason.connectionLost));
  await waitFor(() => fake.sockets.length === 2);
  old.emit('connection.update', { connection: 'open' });
  assert.equal(provider.isReady(), false);
  await provider.stop();
});

test('envio: exige conexão, resolve e cacheia o JID, valida o destinatário', async () => {
  const { provider, fake } = setup();
  await provider.start();

  await assert.rejects(provider.send({ to: '+5511999998888', message: 'oi' }), NotifierUnavailableError);

  fake.last().emit('connection.update', { connection: 'open' });
  const res = await provider.send({ to: '+55 (11) 99999-8888', message: 'Alerta 1' });
  assert.equal(res.id, 'MSG1');
  assert.deepEqual(fake.last().sent[0].jid, '5511999998888@s.whatsapp.net');
  assert.deepEqual(fake.last().sent[0].content, { text: 'Alerta 1' });

  await provider.send({ to: '+5511999998888', message: 'Alerta 2' });
  assert.equal(fake.last().lookups, 1, 'JID deve vir do cache na 2ª mensagem');

  await assert.rejects(provider.send({ to: null, message: 'x' }), RecipientError);
  await assert.rejects(provider.send({ to: '+5511999990000', message: 'x' }), /não tem conta no WhatsApp/);
  await provider.stop();
});

test('fila respeita o intervalo mínimo entre mensagens (anti-bloqueio)', async () => {
  const { provider, fake } = setup();
  await provider.start();
  fake.last().emit('connection.update', { connection: 'open' });
  await Promise.all([1, 2, 3].map((n) => provider.send({ to: '+5511999998888', message: `m${n}` })));
  const [a, b, c] = fake.last().sent;
  assert.deepEqual([a, b, c].map((m) => m.content.text), ['m1', 'm2', 'm3']);
  assert.ok(b.at - a.at >= 55 && c.at - b.at >= 55, `intervalos: ${b.at - a.at}ms, ${c.at - b.at}ms`);
  await provider.stop();
});

test('stop() fecha o socket sem deslogar e não reconecta mais', async () => {
  const { provider, fake } = setup();
  await provider.start();
  const s = fake.last();
  s.emit('connection.update', { connection: 'open' });
  await provider.stop();
  assert.equal(s.ended, true);
  s.emit('connection.update', closeWith(DisconnectReason.connectionClosed));
  await new Promise((r) => setTimeout(r, 60));
  assert.equal(fake.sockets.length, 1);
  assert.equal(provider.status().state, 'stopped');
});
