import { brl } from '../../lib/money.js';

const items = (n) => `${n} ${n === 1 ? 'item' : 'itens'}`;

const tones = {
  red: { tag: 'bg-rose-100 text-rose-700', emoji: '🔥', value: 'text-rose-600', blob: 'bg-rose-100' },
  amber: { tag: 'bg-amber-100 text-amber-800', emoji: '📅', value: 'text-amber-600', blob: 'bg-amber-100' },
  green: { tag: 'bg-emerald-100 text-emerald-800', emoji: '✅', value: 'text-emerald-700', blob: 'bg-emerald-100' },
};

/** Card branco e calmo: a cor aparece só na etiqueta e no número principal. */
function StatCard({ tone, tag, value, caption, note, className = '' }) {
  const t = tones[tone];
  return (
    <section
      className={`motion-safe:animate-pop-in relative overflow-hidden rounded-3xl bg-white p-5 shadow-card ring-1 ring-stone-900/5 transition-transform duration-200 motion-safe:md:hover:-translate-y-1 ${className}`}
    >
      {/* bolha decorativa no canto: cor só no detalhe */}
      <span className={`pointer-events-none absolute -top-8 -right-8 h-24 w-24 rounded-full opacity-60 ${t.blob}`} aria-hidden="true" />
      <span className={`relative inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-extrabold ${t.tag}`}>
        <span aria-hidden="true">{t.emoji}</span>
        {tag}
      </span>
      <p className={`relative mt-4 text-3xl font-black tracking-tight tabular-nums ${t.value}`}>{value}</p>
      <p className="relative mt-1 text-sm font-semibold text-stone-500">{caption}</p>
      {note && (
        <p className="relative mt-3 rounded-2xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">🧺 {note}</p>
      )}
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
