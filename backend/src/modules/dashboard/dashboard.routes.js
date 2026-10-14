import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { toDateOnly } from '../../lib/dates.js';
import { batchRiskCents, describeBatch, fromCents, Semaphore } from '../../domain/expiry.js';
import { serializeBatch } from '../../lib/serializers.js';
import { requireOwner } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { getStoreContext } from '../batches/batches.service.js';

const router = Router();
router.use(requireOwner);

const emptyZone = () => ({ batches: 0, units: 0, valueCents: 0 });

// GET /api/dashboard/summary?top=10 — painel semáforo do dono
router.get('/summary', validate({ query: z.object({ top: z.coerce.number().int().min(1).max(50).default(10) }) }), async (req, res) => {
  const { store, today } = await getStoreContext(req.user.storeId);

  // Lojas pequenas têm centenas/poucos milhares de lotes ativos: agregamos em memória
  // reaproveitando a MESMA regra de classificação usada no resto da API.
  const batches = await prisma.batch.findMany({
    where: { storeId: store.id, status: 'ACTIVE', quantity: { gt: 0 } },
    include: { product: { select: { id: true, barcode: true, name: true, brand: true } } },
    orderBy: { expiryDate: 'asc' },
  });

  const zones = { [Semaphore.RED]: emptyZone(), [Semaphore.YELLOW]: emptyZone(), [Semaphore.GREEN]: emptyZone() };
  const expired = emptyZone();
  const redBatches = [];

  for (const batch of batches) {
    const { semaphore, expired: isExpired } = describeBatch(batch, store, today);
    const cents = batchRiskCents(batch);
    const zone = zones[semaphore];
    zone.batches += 1;
    zone.units += batch.quantity;
    zone.valueCents += cents;
    if (isExpired) {
      expired.batches += 1;
      expired.units += batch.quantity;
      expired.valueCents += cents;
    }
    if (semaphore === Semaphore.RED) redBatches.push(batch);
  }

  const out = ({ valueCents, ...z }) => ({ ...z, value: fromCents(valueCents) });

  res.json({
    today: toDateOnly(today),
    thresholds: { warningDays: store.warningDays, criticalDays: store.criticalDays },
    riskBasis: 'unitCost, com fallback para unitPrice',
    zones: {
      red: { ...out(zones.red), expired: out(expired) },
      yellow: out(zones.yellow),
      green: out(zones.green),
    },
    valueAtRisk: fromCents(zones.red.valueCents),
    // Prioridade de ação: o que vence primeiro aparece primeiro
    topRisk: redBatches.slice(0, req.valid.query.top).map((b) => serializeBatch(b, store, today)),
  });
});

export default router;
