// Saúde do estoque: proporção de itens em dia × vencendo no mês × urgentes.
// Status nunca só por cor: a legenda sempre visível traz rótulo e quantidade de cada faixa.

const SEGMENTS = [
  { key: 'green', label: 'Em dia', color: 'bg-emerald-500' },
  { key: 'yellow', label: 'Este mês', color: 'bg-amber-500' },
  { key: 'red', label: 'Urgente', color: 'bg-red-500' },
];

const pct = (n, total) => (total ? Math.round((n / total) * 100) : 0);

export default function StockHealth({ zones }) {
  const counts = { green: zones.green.batches, yellow: zones.yellow.batches, red: zones.red.batches };
  const total = counts.green + counts.yellow + counts.red;
  const healthy = pct(counts.green, total);
  const summary = total
    ? SEGMENTS.map((s) => `${s.label}: ${counts[s.key]} (${pct(counts[s.key], total)}%)`).join(', ')
    : 'Nenhum produto registrado';

  return (
    <section aria-labelledby="health-title" className="rounded-2xl bg-white p-4 shadow-card ring-1 ring-slate-900/[0.04]">
      <div className="flex items-baseline justify-between gap-3">
        <h3 id="health-title" className="text-sm font-semibold text-slate-700">
          Saúde do estoque
        </h3>
        <p className="text-sm text-slate-500">
          {total ? (
            <>
              <span className="text-lg font-bold tabular-nums text-slate-900">{healthy}%</span> em dia
            </>
          ) : (
            'sem itens ainda'
          )}
        </p>
      </div>

      <div role="img" aria-label={`Saúde do estoque. ${summary}`} className="mt-3 flex h-3 gap-[2px] overflow-hidden rounded-full bg-slate-100">
        {total > 0 &&
          SEGMENTS.filter((s) => counts[s.key] > 0).map((s) => (
            <span
              key={s.key}
              title={`${s.label}: ${counts[s.key]} ${counts[s.key] === 1 ? 'item' : 'itens'} (${pct(counts[s.key], total)}%)`}
              className={`h-full ${s.color} transition-[width] duration-500 first:rounded-l-full last:rounded-r-full`}
              style={{ width: `${Math.max((counts[s.key] / total) * 100, 3)}%` }}
            />
          ))}
      </div>

      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
        {SEGMENTS.map((s) => (
          <li key={s.key} className="inline-flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${s.color}`} aria-hidden="true" />
            {s.label} <span className="font-semibold tabular-nums text-slate-900">{counts[s.key]}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
