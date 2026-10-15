import ProductThumb from '../ui/ProductThumb.jsx';
import { describeDays } from '../ui/SemaphoreBadge.jsx';
import { brl } from '../../lib/money.js';

/**
 * Uma linha compacta: produto, quando vence, quanto dinheiro está parado e a ação.
 * Produtos vencidos NÃO podem ser vendidos (CDC art. 18 §6º): em vez de promoção,
 * a orientação é tirar da prateleira.
 */
export default function ActionItem({ batch, onPromo }) {
  const urgent = batch.semaphore === 'red';
  const canPromo = urgent && !batch.expired;
  const dueClass = batch.expired ? 'text-red-700' : urgent ? 'text-red-600' : 'text-amber-700';
  const due = describeDays(batch.daysToExpiry);
  const value = brl(batch.valueAtRisk);

  const action = (compact) => (
    <>
      {canPromo && (
        <button
          type="button"
          onClick={() => onPromo(batch)}
          className={`inline-flex items-center gap-1.5 rounded-lg bg-white font-medium text-stone-800 ring-1 ring-inset ring-stone-300 transition-colors hover:bg-stone-900 hover:text-white hover:ring-stone-900 active:bg-stone-800 active:text-white ${
            compact ? 'h-8 px-2.5 text-[13px]' : 'h-9 px-3 text-sm'
          }`}
        >
          <TagIcon />
          {compact ? 'Promoção' : 'Criar promoção'}
        </button>
      )}
      {batch.expired && <span className="text-xs font-medium text-stone-500">Tirar da venda</span>}
    </>
  );

  return (
    <li className="px-4 py-3 transition-colors sm:px-5 md:hover:bg-stone-50">
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

/** Etiqueta de preço em traço (herda a cor do botão). */
function TagIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M3 12V4.5A1.5 1.5 0 0 1 4.5 3H12l9 9-9 9Z" strokeLinejoin="round" />
      <circle cx="7.5" cy="7.5" r="1.3" fill="currentColor" stroke="none" />
    </svg>
  );
}
