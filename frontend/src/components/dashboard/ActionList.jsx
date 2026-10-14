import { useState } from 'react';
import ActionItem from './ActionItem.jsx';

const FILTERS = [
  { key: 'all', label: 'Todos' },
  { key: 'red', label: 'Risco' },
  { key: 'yellow', label: 'Atenção' },
];

/** Só o que exige ação (vermelho + amarelo), do que vence primeiro para o último. */
export default function ActionList({ items, total, onPromo }) {
  const [filter, setFilter] = useState('all');
  const counts = {
    all: items.length,
    red: items.filter((b) => b.semaphore === 'red').length,
    yellow: items.filter((b) => b.semaphore === 'yellow').length,
  };
  const visible = filter === 'all' ? items : items.filter((b) => b.semaphore === filter);

  return (
    <section aria-labelledby="action-title">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="action-title" className="text-xl font-bold text-slate-900">
            Lista de ação
          </h2>
          <p className="text-sm text-slate-500">Ordenada pelo que vence primeiro</p>
        </div>
        <div className="flex rounded-2xl bg-slate-200/70 p-1" role="tablist" aria-label="Filtrar lista">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              role="tab"
              aria-selected={filter === f.key}
              onClick={() => setFilter(f.key)}
              className={`h-10 rounded-xl px-3.5 text-sm font-semibold transition-colors ${
                filter === f.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
            >
              {f.label} <span className="tabular-nums opacity-60">{counts[f.key]}</span>
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-3xl bg-white px-6 py-10 text-center ring-1 ring-slate-200">
          <p className="text-3xl" aria-hidden="true">🎉</p>
          <p className="mt-2 font-semibold text-slate-900">Nada para resolver aqui</p>
          <p className="mt-1 text-sm text-slate-500">Nenhum lote nesta faixa de vencimento.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="hidden grid-cols-[3.5rem_minmax(0,1fr)_9rem_6rem_8rem_12rem] gap-x-4 border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 md:grid">
            <span />
            <span>Produto</span>
            <span>Vencimento</span>
            <span className="text-right">Qtd.</span>
            <span className="text-right">Prejuízo</span>
            <span />
          </div>
          <ul className="divide-y divide-slate-100">
            {visible.map((batch) => (
              <ActionItem key={batch.id} batch={batch} onPromo={onPromo} />
            ))}
          </ul>
        </div>
      )}

      {total > items.length && (
        <p className="mt-3 text-center text-sm text-slate-500">
          Mostrando os {items.length} primeiros de {total} lotes.
        </p>
      )}
    </section>
  );
}
