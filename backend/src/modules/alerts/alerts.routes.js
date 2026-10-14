import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { pagination } from '../../lib/schemas.js';
import { serializeAlert } from '../../lib/serializers.js';
import { requireOwner } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { runExpiryCheck } from './alerts.service.js';

const router = Router();
router.use(requireOwner);

const listQuery = z.object({
  level: z.enum(['WARNING', 'CRITICAL', 'EXPIRED']).optional(),
  status: z.enum(['PENDING', 'SENT', 'FAILED']).optional(),
  ...pagination,
});

// GET /api/alerts — histórico de notificações da loja
router.get('/', validate({ query: listQuery }), async (req, res) => {
  const { level, status, page, pageSize } = req.valid.query;
  const where = { storeId: req.user.storeId, level, status };
  const [items, total] = await prisma.$transaction([
    prisma.expiryAlert.findMany({
      where,
      include: { batch: { select: { product: { select: { name: true, barcode: true } } } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.expiryAlert.count({ where }),
  ]);
  res.json({
    items: items.map((a) => ({ ...serializeAlert(a), product: a.batch.product })),
    total,
    page,
    pageSize,
  });
});

// POST /api/alerts/run — dispara agora a mesma verificação do cron (só para a loja do usuário)
router.post('/run', async (req, res) => {
  const [result] = await runExpiryCheck({ storeId: req.user.storeId });
  res.json(result);
});

export default router;
