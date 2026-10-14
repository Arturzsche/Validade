// Provider WhatsApp via Baileys (protocolo do WhatsApp Web por WebSocket, sem navegador).
//
// ⚠️ Cliente NÃO oficial: serve para validar o MVP com custo zero. O WhatsApp pode
// bloquear números que disparam em volume; use um chip dedicado a testes.
//
// Ciclo de vida:
//   start() -> conecta -> (sem sessão salva) imprime QR no terminal -> 'open'
//   queda   -> reconecta sozinho com backoff exponencial (1s, 2s, 4s ... até 60s)
//   logout feito pelo celular -> apaga credenciais e gera QR novo
//   outra instância abriu a mesma sessão -> para (evita as duas se derrubarem em loop)

import { rm } from 'node:fs/promises';
import pino from 'pino';
import qrcode from 'qrcode-terminal';
import makeWASocket, { Browsers, DisconnectReason, fetchLatestBaileysVersion, useMultiFileAuthState } from 'baileys';
import { NotifierUnavailableError, RecipientError } from '../errors.js';
import { toWhatsAppNumber } from '../phone.js';
import { createSendQueue } from '../sendQueue.js';

const SEND_TIMEOUT_MS = 30_000;

const withTimeout = (promise, ms, message) =>
  Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms).unref?.())]);

export function createBaileysProvider({
  authDir,
  sendIntervalMs = 3000,
  logLevel = 'warn',
  reconnect = { baseMs: 1000, maxMs: 60_000 },
  log = console,
  // Injetáveis para testes (socket falso, sem rede)
  makeSocket = makeWASocket,
  loadAuthState = useMultiFileAuthState,
  fetchVersion = fetchLatestBaileysVersion,
  clearAuthState = (dir) => rm(dir, { recursive: true, force: true }),
  printQr = (qr) => qrcode.generate(qr, { small: true }),
} = {}) {
  const logger = pino({ level: logLevel });
  const enqueue = createSendQueue({ minIntervalMs: sendIntervalMs });
  const readyListeners = new Set();
  const jidCache = new Map();

  let sock = null;
  let state = 'idle'; // idle | connecting | waiting_qr | open | reconnecting | replaced | stopped
  let me = null;
  let lastError = null;
  let attempts = 0;
  let timer = null;
  let stopped = false;
  let version; // versão do WhatsApp Web, buscada uma vez

  function scheduleReconnect(delayMs) {
    clearTimeout(timer);
    state = 'reconnecting';
    timer = setTimeout(() => {
      connect().catch((err) => {
        lastError = err.message;
        log.error('[whatsapp] falha ao reconectar:', err.message);
        scheduleReconnect(nextBackoff());
      });
    }, delayMs);
  }

  function nextBackoff() {
    const ms = Math.min(reconnect.maxMs, reconnect.baseMs * 2 ** attempts);
    attempts += 1;
    return ms + Math.floor(Math.random() * Math.min(1000, ms * 0.2)); // jitter
  }

  async function handleClose(lastDisconnect) {
    const code = lastDisconnect?.error?.output?.statusCode;
    lastError = lastDisconnect?.error?.message ?? `desconectado (código ${code ?? '?'})`;
    me = null;
    if (stopped) return;

    if (code === DisconnectReason.loggedOut) {
      log.warn('[whatsapp] ⚠️ Sessão encerrada pelo celular. Apagando credenciais: um novo QR será gerado.');
      jidCache.clear();
      await clearAuthState(authDir);
      attempts = 0;
      scheduleReconnect(0);
      return;
    }

    if (code === DisconnectReason.connectionReplaced) {
      state = 'replaced';
      log.error(
        '[whatsapp] ❌ Esta sessão foi aberta em outro lugar (outra instância do servidor?). ' +
          'Reconexão automática suspensa para evitar disputa. Reinicie o servidor para retomar.',
      );
      return;
    }

    if (code === DisconnectReason.restartRequired) {
      // Normal logo após escanear o QR: o WhatsApp pede para reabrir a conexão
      scheduleReconnect(0);
      return;
    }

    const delay = nextBackoff();
    log.warn(`[whatsapp] conexão caiu (${lastError}). Tentando de novo em ${Math.round(delay / 1000)}s...`);
    scheduleReconnect(delay);
  }

  async function connect() {
    if (stopped) return;
    state = 'connecting';

    const { state: auth, saveCreds } = await loadAuthState(authDir);
    if (!version) {
      // Sem rede/lento: segue com a versão embutida na biblioteca
      const latest = await withTimeout(fetchVersion(), 5000, 'timeout').catch(() => null);
      if (latest?.version && !latest.error) version = latest.version;
    }

    const socket = makeSocket({
      auth,
      ...(version && { version }),
      logger,
      browser: Browsers.ubuntu('Validade'),
      markOnlineOnConnect: false, // não "rouba" as notificações do celular do lojista
      // Não baixa o histórico completo. Atenção: NÃO desligar o sync inicial via
      // shouldSyncHistoryMessage — o Baileys 7 precisa dele para os mapeamentos LID
      // (o próprio Baileys avisa que isso causa instabilidade e erros de sessão).
      syncFullHistory: false,
    });
    sock = socket;

    socket.ev.on('creds.update', saveCreds);
    socket.ev.on('connection.update', (update) => {
      if (socket !== sock) return; // evento atrasado de um socket já descartado
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        state = 'waiting_qr';
        log.info('\n[whatsapp] 📱 Escaneie o QR abaixo: WhatsApp > Configurações > Aparelhos conectados > Conectar aparelho\n');
        printQr(qr);
      }

      if (connection === 'open') {
        state = 'open';
        attempts = 0;
        lastError = null;
        me = socket.user?.id ?? null;
        log.info(`[whatsapp] ✅ Conectado como ${me ?? 'desconhecido'}`);
        for (const listener of readyListeners) {
          Promise.resolve()
            .then(listener)
            .catch((err) => log.error('[whatsapp] erro em listener de conexão:', err));
        }
      }

      if (connection === 'close') {
        handleClose(lastDisconnect).catch((err) => log.error('[whatsapp] erro ao tratar desconexão:', err));
      }
    });
  }

  async function resolveJid(phone) {
    const number = toWhatsAppNumber(phone);
    if (!number) throw new RecipientError('Loja sem número de WhatsApp válido cadastrado');
    if (jidCache.has(number)) return jidCache.get(number);

    // onWhatsApp resolve o JID real — inclusive a diferença do 9º dígito em números brasileiros
    const [result] = (await sock.onWhatsApp(number)) ?? [];
    if (!result?.exists) throw new RecipientError(`O número ${phone} não tem conta no WhatsApp`);
    jidCache.set(number, result.jid);
    return result.jid;
  }

  return {
    name: 'whatsapp',
    channel: 'WHATSAPP',

    async start() {
      stopped = false;
      attempts = 0;
      await connect().catch((err) => {
        lastError = err.message;
        log.error('[whatsapp] falha ao iniciar:', err.message);
        scheduleReconnect(nextBackoff());
      });
    },

    async stop() {
      stopped = true;
      clearTimeout(timer);
      state = 'stopped';
      const current = sock;
      sock = null;
      // end() fecha o socket sem deslogar: a sessão salva continua válida no próximo start
      try {
        await current?.end(undefined);
      } catch {
        // socket já fechado
      }
    },

    isReady: () => state === 'open',

    /** Executa `listener` a cada (re)conexão. Retorna função para cancelar. */
    onReady(listener) {
      readyListeners.add(listener);
      return () => readyListeners.delete(listener);
    },

    status: () => ({ provider: 'whatsapp', state, me, lastError, reconnectAttempts: attempts }),

    async send({ to, message }) {
      if (state !== 'open') throw new NotifierUnavailableError(`WhatsApp não conectado (estado: ${state})`);
      return enqueue(async () => {
        if (state !== 'open' || !sock) throw new NotifierUnavailableError('WhatsApp desconectou antes do envio');
        const jid = await resolveJid(to);
        const sent = await withTimeout(sock.sendMessage(jid, { text: message }), SEND_TIMEOUT_MS, 'Tempo esgotado ao enviar');
        return { id: sent?.key?.id ?? null };
      });
    },
  };
}
