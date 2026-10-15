import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { pagination } from '../../lib/schemas.js';
import { serializeDailyReport } from '../../lib/serializers.js';
import { requireOwner } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { resendTodayReport, runExpiryCheck } from './alerts.service.js';

const router = Router();
router.use(requireOwner);

const listQuery = z.object({
  status: z.enum(['PENDING', 'SENT', 'FAILED']).optional(),
  ...pagination,
});

// GET /api/alerts — histórico dos relatórios diários enviados no WhatsApp
router.get('/', validate({ query: listQuery }), async (req, res) => {
  const { status, page, pageSize } = req.valid.query;
  const where = { storeId: req.user.storeId, status };
  const [items, total] = await prisma.$transaction([
    prisma.dailyReport.findMany({ where, orderBy: { date: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.dailyReport.count({ where }),
  ]);
  res.json({ items: items.map(serializeDailyReport), total, page, pageSize });
});

// POST /api/alerts/run — roda agora a verificação do cron só para esta loja.
// ?resend=1 apaga o relatório de hoje e envia de novo (teste do dono).
router.post('/run', validate({ query: z.object({ resend: z.stringbool().default(false) }) }), async (req, res) => {
  const result = req.valid.query.resend
    ? await resendTodayReport(req.user.storeId)
    : (await runExpiryCheck({ storeId: req.user.storeId }))[0];
  res.json(result);
});

export default router;
