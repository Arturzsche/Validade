import { semaphoreStyles } from '../ui/SemaphoreBadge.jsx';
import { formatDateBR } from '../../lib/dates.js';

/** Últimos lançamentos desta sessão — confirmação de que o trabalho foi salvo. */
export default function RecentEntries({ entries }) {
  if (!entries.length) {
    return (
      <p className="px-2 text-center text-sm text-slate-500">
        Leia o código de barras de um produto para registrar o lote.
      </p>
    );
  }

  return (
    <section>
      <h2 className="mb-2 px-1 text-sm font-semibold uppercase tracking-wide text-slate-500">Registrados agora</h2>
      <ul className="divide-y divide-slate-100 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
        {entries.map((b) => (
          <li key={`${b.id}-${b.updatedAt}`} className="flex items-center gap-3 px-4 py-3">
            <span className={`h-3 w-3 shrink-0 rounded-full ${semaphoreStyles[b.semaphore].dot}`} aria-label={semaphoreStyles[b.semaphore].label} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-slate-900">{b.product.name}</p>
              <p className="text-sm text-slate-500">
                Val. {formatDateBR(b.expiryDate)} · {b.addedQuantity} un.
                {b.merged && <span> · somado (total {b.quantity})</span>}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
