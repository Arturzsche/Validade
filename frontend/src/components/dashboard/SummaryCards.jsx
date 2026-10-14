import { brl } from '../../lib/money.js';

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

/** Card de maior destaque: dinheiro que vai virar prejuízo se nada for feito. */
function RiskCard({ zone, criticalDays }) {
  const hasRisk = zone.batches > 0;
  return (
    <section
      aria-labelledby="risk-title"
      className={`relative h-full overflow-hidden rounded-3xl p-5 sm:p-6 ${
        hasRisk ? 'bg-red-600 text-white shadow-lg shadow-red-600/30' : 'bg-white text-slate-900 ring-1 ring-slate-200'
      }`}
    >
      {hasRisk && (
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" aria-hidden="true" />
      )}
      <div className="flex items-center gap-2">
        <span className="relative flex h-3 w-3" aria-hidden="true">
          {hasRisk && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/70" />}
          <span className={`relative inline-flex h-3 w-3 rounded-full ${hasRisk ? 'bg-white' : 'bg-red-500'}`} />
        </span>
        <h2 id="risk-title" className={`text-sm font-bold uppercase tracking-wider ${hasRisk ? 'text-red-50' : 'text-red-600'}`}>
          Risco · menos de {criticalDays} dias + vencidos
        </h2>
      </div>

      <p className="mt-4 text-sm font-medium opacity-90">Valor em risco</p>
      <p className="text-4xl font-extrabold tracking-tight tabular-nums sm:text-5xl md:text-6xl">{brl(zone.value)}</p>
      <p className="mt-1 text-sm opacity-90">
        {hasRisk ? 'em custo de mercadoria que pode virar prejuízo' : 'Nenhum lote perto de vencer. Bom trabalho!'}
      </p>

      {hasRisk && (
        <div className="mt-5 flex flex-wrap gap-2">
          <span className="rounded-full bg-white/15 px-3 py-1 text-sm font-semibold">
            {plural(zone.batches, 'lote', 'lotes')} · {plural(zone.units, 'unidade', 'unidades')}
          </span>
          {zone.expired.batches > 0 && (
            <span className="rounded-full bg-red-950/40 px-3 py-1 text-sm font-semibold">
              ⛔ {plural(zone.expired.batches, 'vencido', 'vencidos')} · {brl(zone.expired.value)}
            </span>
          )}
        </div>
      )}
    </section>
  );
}

function ZoneCard({ tone, title, subtitle, primary, secondary }) {
  const styles = {
    yellow: { dot: 'bg-amber-400', title: 'text-amber-700', ring: 'ring-amber-200', bg: 'bg-amber-50' },
    green: { dot: 'bg-emerald-500', title: 'text-emerald-700', ring: 'ring-slate-200', bg: 'bg-white' },
  }[tone];
  return (
    <section className={`rounded-3xl p-4 ring-1 sm:p-5 md:col-span-2 ${styles.bg} ${styles.ring}`}>
      <div className="flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${styles.dot}`} aria-hidden="true" />
        <h2 className={`text-xs font-bold uppercase tracking-wider ${styles.title}`}>{title}</h2>
      </div>
      <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
      <p className="mt-3 text-2xl font-extrabold tabular-nums text-slate-900 sm:text-3xl">{primary}</p>
      <p className="text-sm text-slate-600 tabular-nums">{secondary}</p>
    </section>
  );
}

export default function SummaryCards({ zones, thresholds }) {
  const { red, yellow, green } = zones;
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
      <div className="col-span-2 md:row-span-2">
        <RiskCard zone={red} criticalDays={thresholds.criticalDays} />
      </div>
      <ZoneCard
        tone="yellow"
        title="Atenção"
        subtitle={`${thresholds.criticalDays} a ${thresholds.warningDays} dias`}
        primary={plural(yellow.batches, 'lote', 'lotes')}
        secondary={`${brl(yellow.value)} em mercadoria`}
      />
      <ZoneCard
        tone="green"
        title="Seguro"
        subtitle={`mais de ${thresholds.warningDays} dias`}
        primary={plural(green.batches, 'lote', 'lotes')}
        secondary={`${plural(green.units, 'unidade', 'unidades')} ok`}
      />
    </div>
  );
}
