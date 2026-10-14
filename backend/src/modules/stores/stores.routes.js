import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { phone } from '../../lib/schemas.js';
import { serializeStore } from '../../lib/serializers.js';
import { requireOwner } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';

const router = Router();

const isValidTimeZone = (tz) => {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

const updateSchema = z
  .object({
    name: z.string().trim().min(2),
    segment: z.string().trim().max(40).nullable(),
    whatsappPhone: phone.nullable(),
    timezone: z.string().refine(isValidTimeZone, 'Fuso horário inválido'),
    warningDays: z.number().int().min(1).max(365),
    criticalDays: z.number().int().min(1).max(365),
    suggestedDiscountPct: z.number().int().min(1).max(90),
  })
  .partial();

// GET /api/stores/me
router.get('/me', async (req, res) => {
  const store = await prisma.store.findUniqueOrThrow({ where: { id: req.user.storeId } });
  res.json(serializeStore(store));
});

// PATCH /api/stores/me — WhatsApp de destino, limites do semáforo, desconto sugerido
router.patch('/me', requireOwner, validate({ body: updateSchema }), async (req, res) => {
  const current = await prisma.store.findUniqueOrThrow({ where: { id: req.user.storeId } });
  const data = req.valid.body;

  const warningDays = data.warningDays ?? current.warningDays;
  const criticalDays = data.criticalDays ?? current.criticalDays;
  if (criticalDays >= warningDays) {
    return res.status(400).json({
      error: { code: 'INVALID_THRESHOLDS', message: 'criticalDays deve ser menor que warningDays' },
    });
  }

  const store = await prisma.store.update({ where: { id: current.id }, data });
  res.json(serializeStore(store));
});

export default router;
