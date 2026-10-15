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
          className={`inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white font-semibold text-slate-800 shadow-sm transition-colors active:bg-emerald-50 md:hover:border-emerald-500 md:hover:bg-emerald-50 md:hover:text-emerald-800 ${
            compact ? 'h-8 px-2.5 text-[13px]' : 'h-9 px-3 text-sm'
          }`}
        >
          <TagIcon />
          {compact ? 'Promoção' : 'Criar promoção'}
        </button>
      )}
      {batch.expired && <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">Tirar da venda</span>}
    </>
  );

  return (
    <li className="px-4 py-3 sm:px-5">
      {/* Celular: duas linhas — nome e valor em cima; quando vence, quantidade e ação embaixo */}
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 sm:hidden">
        <div className="row-span-2">
          <ProductThumb src={batch.product.imageUrl} name={batch.product.name} size="sm" />
        </div>
        <p className="truncate font-medium text-slate-900">{batch.product.name}</p>
        <p className="text-right text-sm font-semibold tabular-nums text-slate-900" title="Dinheiro parado">
          {value}
        </p>
        <p className="truncate text-[13px] text-slate-500">
          <span className={`font-medium ${dueClass}`}>{due}</span> · {batch.quantity} un.
        </p>
        <div className="flex justify-end">{action(true)}</div>
      </div>

      {/* Desktop: uma linha, com data e valor em colunas alinhadas */}
      <div className="hidden items-center gap-4 sm:flex">
        <ProductThumb src={batch.product.imageUrl} name={batch.product.name} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-slate-900">{batch.product.name}</p>
          <p className="mt-0.5 text-sm text-slate-500">{batch.quantity} un.</p>
        </div>
        <p className={`w-36 shrink-0 text-sm font-medium ${dueClass}`}>{due}</p>
        <p className="w-28 shrink-0 text-right">
          <span className="block text-sm font-semibold tabular-nums text-slate-900">{value}</span>
          <span className="block text-xs text-slate-500">parado</span>
        </p>
        <div className="flex w-40 shrink-0 justify-end">{action(false)}</div>
      </div>
    </li>
  );
}

/** Etiqueta de preço com "%" no verde da marca — o mesmo símbolo do logo iValida. */
function TagIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4 text-emerald-600" aria-hidden="true">
      <path
        d="M2.5 4.2v4.6c0 .5.2.9.5 1.2l6.6 6.6a1.7 1.7 0 0 0 2.4 0l4.6-4.6a1.7 1.7 0 0 0 0-2.4L10 3a1.7 1.7 0 0 0-1.2-.5H4.2c-.9 0-1.7.8-1.7 1.7Z"
        fill="currentColor"
      />
      <circle cx="6" cy="6" r="1.1" fill="#fff" />
      <path d="M8.6 12.6l3.6-3.6" stroke="#fff" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="9" cy="9.3" r=".8" fill="#fff" />
      <circle cx="11.8" cy="12.2" r=".8" fill="#fff" />
    </svg>
  );
}
