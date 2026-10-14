import { Router } from 'express';
import QRCode from 'qrcode';
import { env } from '../../config/env.js';
import { prisma } from '../../lib/prisma.js';
import { forbidden } from '../../lib/httpError.js';
import { requireOwner } from '../../middlewares/auth.js';
import { getNotifier } from '../../notifications/index.js';
import { NotifierUnavailableError, RecipientError } from '../../notifications/errors.js';

const router = Router();
router.use(requireOwner);

/** Administra a sessão do WhatsApp da plataforma (ver WHATSAPP_ADMIN_EMAILS em config/env.js). */
const canManage = (user) => env.WHATSAPP_ADMIN_EMAILS.includes(user.email.toLowerCase());

function requireChannelAdmin(req, _res, next) {
  if (!canManage(req.user)) {
    throw forbidden(
      env.WHATSAPP_ADMIN_EMAILS.length
        ? 'Apenas o administrador da plataforma pode reconectar o WhatsApp'
        : 'Defina WHATSAPP_ADMIN_EMAILS no servidor para gerenciar o WhatsApp pelo painel',
    );
  }
  next();
}

function publicStatus(user) {
  const { provider, state, me, lastError, reconnectAttempts } = getNotifier().status();
  const admin = canManage(user);
  return {
    provider,
    state,
    reconnectAttempts: reconnectAttempts ?? 0,
    canManage: admin,
    // número remetente e erro técnico só para quem administra o canal
    ...(admin && { me: me ?? null, lastError: lastError ?? null }),
  };
}

// GET /api/notifications/status — indicador do cabeçalho (verde/amarelo/vermelho)
router.get('/status', (req, res) => {
  res.json(publicStatus(req.user));
});

// GET /api/notifications/whatsapp/qr — QR atual como imagem (o painel consulta a cada ~2s)
router.get('/whatsapp/qr', requireChannelAdmin, async (req, res) => {
  const pending = getNotifier().getQr();
  res.set('Cache-Control', 'no-store');
  res.json({
    ...publicStatus(req.user),
    qr: pending ? await QRCode.toDataURL(pending.qr, { margin: 1, width: 320, errorCorrectionLevel: 'L' }) : null,
    qrGeneratedAt: pending?.generatedAt ?? null,
  });
});

// POST /api/notifications/whatsapp/reconnect — "Gerar novo QR" / retomar sessão agora
router.post('/whatsapp/reconnect', requireChannelAdmin, async (req, res) => {
  await getNotifier().restart();
  res.json(publicStatus(req.user));
});

// POST /api/notifications/test — envia uma mensagem de teste para o WhatsApp da loja
router.post('/test', async (req, res) => {
  const store = await prisma.store.findUniqueOrThrow({ where: { id: req.user.storeId } });
  const notifier = getNotifier();
  try {
    const result = await notifier.send({
      to: store.whatsappPhone,
      message: `✅ *Validade · ${store.name}*\nTudo certo! Os alertas de vencimento da loja vão chegar neste número.`,
    });
    res.json({ ok: true, channel: notifier.channel, to: store.whatsappPhone, messageId: result?.id ?? null });
  } catch (err) {
    if (err instanceof NotifierUnavailableError) {
      return res.status(503).json({ error: { code: 'NOTIFIER_UNAVAILABLE', message: err.message } });
    }
    if (err instanceof RecipientError) {
      return res.status(422).json({ error: { code: 'INVALID_RECIPIENT', message: err.message } });
    }
    throw err;
  }
});

export default router;
