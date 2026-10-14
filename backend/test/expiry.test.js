import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addDays, diffInDays, parseDateOnly, todayInTimeZone } from '../src/lib/dates.js';
import {
  alertLevelFor,
  batchRiskCents,
  classify,
  describeBatch,
  expiryDateFilterFor,
  promoPriceCents,
  riskBasis,
} from '../src/domain/expiry.js';

const store = { warningDays: 30, criticalDays: 15 };
const today = parseDateOnly('2026-10-14');

test('classify: fronteiras do semáforo (vermelho < 15 <= amarelo <= 30 < verde)', () => {
  assert.equal(classify(-3, store), 'red');
  assert.equal(classify(0, store), 'red');
  assert.equal(classify(14, store), 'red');
  assert.equal(classify(15, store), 'yellow');
  assert.equal(classify(30, store), 'yellow');
  assert.equal(classify(31, store), 'green');
});

test('expiryDateFilterFor é consistente com classify', () => {
  for (let d = -5; d <= 40; d++) {
    const date = addDays(today, d);
    const color = classify(d, store);
    for (const c of ['red', 'yellow', 'green']) {
      const f = expiryDateFilterFor(c, today, store);
      const inRange =
        (f.lt === undefined || date < f.lt) &&
        (f.lte === undefined || date <= f.lte) &&
        (f.gt === undefined || date > f.gt) &&
        (f.gte === undefined || date >= f.gte);
      assert.equal(inRange, c === color, `d=${d} cor=${c}`);
    }
  }
});

test('alertLevelFor: só gera alerta na zona vermelha', () => {
  assert.equal(alertLevelFor(-1, store), 'EXPIRED');
  assert.equal(alertLevelFor(0, store), 'CRITICAL');
  assert.equal(alertLevelFor(14, store), 'CRITICAL');
  assert.equal(alertLevelFor(15, store), null);
});

test('valor em risco usa custo e cai para preço de venda quando custo é nulo', () => {
  assert.equal(batchRiskCents({ quantity: 3, unitCost: '2.10', unitPrice: '4.99' }), 630);
  assert.equal(riskBasis({ unitCost: '2.10' }), 'cost');
  assert.equal(batchRiskCents({ quantity: 3, unitCost: null, unitPrice: '4.99' }), 1497);
  assert.equal(riskBasis({ unitCost: null }), 'price');
  // sem erro de ponto flutuante: 0.1 + 0.2
  assert.equal(batchRiskCents({ quantity: 3, unitCost: '0.10', unitPrice: '1' }), 30);
});

test('describeBatch monta os campos derivados', () => {
  const batch = { expiryDate: parseDateOnly('2026-10-20'), quantity: 10, unitCost: null, unitPrice: '5.50' };
  assert.deepEqual(describeBatch(batch, store, today), {
    daysToExpiry: 6,
    expired: false,
    semaphore: 'red',
    riskBasis: 'price',
    valueAtRisk: 55,
    expiryDate: '2026-10-20',
  });
});

test('promoPriceCents aplica o desconto sobre o preço de venda', () => {
  assert.equal(promoPriceCents({ unitPrice: '10.00' }, 30), 700);
  assert.equal(promoPriceCents({ unitPrice: '4.99' }, 30), 349);
});

test('todayInTimeZone respeita o fuso da loja', () => {
  // 02:00 UTC do dia 15 ainda é dia 14 em São Paulo (UTC-3)
  const now = new Date('2026-10-15T02:00:00Z');
  assert.equal(diffInDays(parseDateOnly('2026-10-14'), todayInTimeZone('America/Sao_Paulo', now)), 0);
  assert.equal(diffInDays(parseDateOnly('2026-10-15'), todayInTimeZone('UTC', now)), 0);
});

test('parseDateOnly rejeita datas inexistentes', () => {
  assert.throws(() => parseDateOnly('2026-02-30'));
  assert.throws(() => parseDateOnly('14/10/2026'));
});
