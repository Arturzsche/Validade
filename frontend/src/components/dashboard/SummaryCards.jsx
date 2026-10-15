import { brl } from '../../lib/money.js';

const items = (n) => `${n} ${n === 1 ? 'item' : 'itens'}`;

const tones = {
  red: { tag: 'bg-red-50 text-red-700', dot: 'bg-red-500', value: 'text-red-600' },
  amber: { tag: 'bg-amber-50 text-amber-800', dot: 'bg-amber-400', value: 'text-amber-700' },
  green: { tag: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500', value: 'text-slate-900' },
};

/** Card branco e calmo: a cor aparece só na etiqueta e no número principal. */
function StatCard({ tone, tag, value, caption, note, className = '' }) {
  const t = tones[tone];
  return (
    <section className={`rounded-2xl bg-white p-5 shadow-card ring-1 ring-slate-900/[0.04] ${className}`}>
      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${t.tag}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${t.dot}`} aria-hidden="true" />
        {tag}
      </span>
      <p className={`mt-4 text-3xl font-bold tracking-tight tabular-nums ${t.value}`}>{value}</p>
      <p className="mt-1 text-sm text-slate-600">{caption}</p>
      {note && <p className="mt-3 border-t border-slate-100 pt-3 text-sm text-slate-500">{note}</p>}
    </section>
  );
}

export default function SummaryCards({ zones, thresholds }) {
  const { red, yellow, green } = zones;
  const urgentDays = thresholds.criticalDays - 1;

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
      <StatCard
        className="col-span-2 md:col-span-1"
        tone="red"
        tag="Ação urgente"
        value={brl(red.value)}
        caption={
          red.batches
            ? `a recuperar em ${items(red.batches)} que vencem em até ${urgentDays} dias`
            : `Nada vencendo nos próximos ${urgentDays} dias`
        }
        note={
          red.expired.batches > 0 &&
          `${items(red.expired.batches)} já ${red.expired.batches === 1 ? 'venceu' : 'venceram'} e ${red.expired.batches === 1 ? 'precisa' : 'precisam'} sair da prateleira`
        }
      />
      <StatCard
        tone="amber"
        tag="Vence este mês"
        value={brl(yellow.value)}
        caption={yellow.batches ? `dinheiro parado em ${items(yellow.batches)}` : 'Nenhum item'}
      />
      <StatCard
        tone="green"
        tag="Tudo certo"
        value={items(green.batches)}
        caption={`com mais de ${thresholds.warningDays} dias de validade`}
      />
    </div>
  );
}
