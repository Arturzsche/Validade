import { brl } from '../../lib/money.js';

const items = (n) => `${n} ${n === 1 ? 'item' : 'itens'}`;

const tones = {
  red: { dot: 'bg-red-500', label: 'text-red-700' },
  amber: { dot: 'bg-amber-500', label: 'text-amber-700' },
  green: { dot: 'bg-emerald-500', label: 'text-emerald-700' },
};

/** Card de número: rótulo pequeno com ponto de cor (status nunca só pela cor), valor em destaque. */
function StatCard({ tone, tag, value, caption, note }) {
  const t = tones[tone];
  return (
    <section className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-stone-200">
      <p className={`flex items-center gap-2 text-sm font-medium ${t.label}`}>
        <span className={`h-2 w-2 rounded-full ${t.dot}`} aria-hidden="true" />
        {tag}
      </p>
      <p className="mt-3 text-3xl font-semibold tracking-tight tabular-nums text-stone-900">{value}</p>
      <p className="mt-1 text-sm text-stone-500">{caption}</p>
      {note && <p className="mt-3 border-t border-stone-100 pt-3 text-sm font-medium text-red-700">{note}</p>}
    </section>
  );
}

export default function SummaryCards({ zones, thresholds }) {
  const { red, yellow, green } = zones;
  const urgentDays = thresholds.criticalDays - 1;

  return (
    <div className="grid gap-3 md:grid-cols-3 md:gap-4">
      <StatCard
        tone="red"
        tag="Ação urgente"
        value={brl(red.value)}
        caption={red.batches ? `em ${items(red.batches)} que vencem em até ${urgentDays} dias` : `Nada vencendo nos próximos ${urgentDays} dias`}
        note={
          red.expired.batches > 0 &&
          `${items(red.expired.batches)} já ${red.expired.batches === 1 ? 'venceu' : 'venceram'}: tirar da prateleira`
        }
      />
      <StatCard
        tone="amber"
        tag="Vence este mês"
        value={brl(yellow.value)}
        caption={yellow.batches ? `em ${items(yellow.batches)}` : 'Nenhum item'}
      />
      <StatCard
        tone="green"
        tag="Tudo certo"
        value={brl(green.value)}
        caption={green.batches ? `em ${items(green.batches)} com mais de ${thresholds.warningDays} dias` : 'Nenhum item'}
      />
    </div>
  );
}
