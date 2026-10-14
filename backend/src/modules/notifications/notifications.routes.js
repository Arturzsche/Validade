import { Router } from 'express';
import { prisma } from '../../lib/prisma.js';
import { requireOwner } from '../../middlewares/auth.js';
import { getNotifier } from '../../notifications/index.js';
import { NotifierUnavailableError, RecipientError } from '../../notifications/errors.js';

const router = Router();
router.use(requireOwner);

// GET /api/notifications/status — o canal está conectado? (ex: WhatsApp aguardando QR)
router.get('/status', (_req, res) => {
  res.json(getNotifier().status());
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
      return res.status(503).json({ error: { code: 'NOTIFIER_UNAVAILABLE', message: err.message, details: notifier.status() } });
    }
    if (err instanceof RecipientError) {
      return res.status(422).json({ error: { code: 'INVALID_RECIPIENT', message: err.message } });
    }
    throw err;
  }
});

export default router;
