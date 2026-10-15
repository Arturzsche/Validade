import ProductThumb from '../ui/ProductThumb.jsx';
import { describeDays } from '../ui/SemaphoreBadge.jsx';
import { brl } from '../../lib/money.js';

/**
 * Uma linha compacta, estilo lista de tarefas: produto, quando vence, quanto dinheiro está
 * parado e a ação. Produtos vencidos NÃO podem ser vendidos (CDC art. 18 §6º): em vez de
 * promoção, a orientação é tirar da prateleira.
 */
export default function ActionItem({ batch, onPromo }) {
  const urgent = batch.semaphore === 'red';
  const canPromo = urgent && !batch.expired;
  const dueClass = urgent ? 'text-red-600' : 'text-amber-700';
  const due = describeDays(batch.daysToExpiry);
  const value = brl(batch.valueAtRisk);

  const action = (compact) => (
    <>
      {canPromo && (
        <button
          type="button"
          onClick={() => onPromo(batch)}
          className={`inline-flex items-center gap-1.5 rounded-full bg-amber-300 font-extrabold text-amber-950 shadow-[0_3px_0_#d97706] transition-all active:translate-y-[2px] active:shadow-none motion-safe:md:hover:-translate-y-0.5 motion-safe:md:hover:rotate-[-2deg] md:hover:bg-amber-200 ${
            compact ? 'h-8 px-3 text-[13px]' : 'h-9 px-4 text-sm'
          }`}
        >
          <TagIcon />
          {compact ? 'Promoção' : 'Criar promoção'}
        </button>
      )}
      {batch.expired && <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-extrabold text-stone-600">🧺 Tirar da venda</span>}
    </>
  );

  return (
    <li className="px-4 py-3 transition-colors sm:px-5 md:hover:bg-amber-50/60">
      {/* Celular: duas linhas — nome e valor em cima; quando vence, quantidade e ação embaixo */}
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 sm:hidden">
        <div className="row-span-2">
          <ProductThumb product={batch.product} size="sm" />
        </div>
        <p className="truncate font-medium text-stone-900">{batch.product.name}</p>
        <p className="text-right text-sm font-semibold tabular-nums text-stone-900" title="Dinheiro parado">
          {value}
        </p>
        <p className="truncate text-[13px] text-stone-500">
          <span className={`font-medium ${dueClass}`}>{due}</span> · {batch.quantity} un.
        </p>
        <div className="flex justify-end">{action(true)}</div>
      </div>

      {/* Desktop: uma linha, com data e valor em colunas alinhadas */}
      <div className="hidden items-center gap-4 sm:flex">
        <ProductThumb product={batch.product} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-stone-900">{batch.product.name}</p>
          <p className="mt-0.5 text-sm text-stone-500">{batch.quantity} un.</p>
        </div>
        <p className={`w-36 shrink-0 text-sm font-medium ${dueClass}`}>{due}</p>
        <p className="w-28 shrink-0 text-right">
          <span className="block text-sm font-semibold tabular-nums text-stone-900">{value}</span>
          <span className="block text-xs text-stone-500">parado</span>
        </p>
        <div className="flex w-40 shrink-0 justify-end">{action(false)}</div>
      </div>
    </li>
  );
}

/** Etiqueta de preço com "%" no verde da marca — o mesmo símbolo do logo iValida. */
function TagIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4 text-amber-900" aria-hidden="true">
      <path
        d="M2.5 4.2v4.6c0 .5.2.9.5 1.2l6.6 6.6a1.7 1.7 0 0 0 2.4 0l4.6-4.6a1.7 1.7 0 0 0 0-2.4L10 3a1.7 1.7 0 0 0-1.2-.5H4.2c-.9 0-1.7.8-1.7 1.7Z"
        fill="currentColor"
      />
      <circle cx="6" cy="6" r="1.1" fill="#fcd34d" />
      <path d="M8.6 12.6l3.6-3.6" stroke="#fcd34d" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="9" cy="9.3" r=".8" fill="#fcd34d" />
      <circle cx="11.8" cy="12.2" r=".8" fill="#fcd34d" />
    </svg>
  );
}
