import ProductThumb from '../ui/ProductThumb.jsx';
import { describeDays, semaphoreStyles } from '../ui/SemaphoreBadge.jsx';
import { brl } from '../../lib/money.js';
import { formatDateBR } from '../../lib/dates.js';

/**
 * Uma linha da lista de ação. Celular: card empilhado; desktop: linha de tabela.
 * Lotes vermelhos ainda dentro da validade ganham o botão de queima de estoque.
 * Lotes vencidos NÃO podem ser vendidos (CDC art. 18 §6º): mostramos "retirar da venda".
 */
export default function ActionItem({ batch, onPromo }) {
  const s = semaphoreStyles[batch.semaphore];
  const canPromo = batch.semaphore === 'red' && !batch.expired;

  return (
    <li className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-3 px-4 py-4 md:grid-cols-[auto_minmax(0,1fr)_9rem_6rem_8rem_12rem] md:gap-x-4 md:py-3">
      <ProductThumb src={batch.product.imageUrl} name={batch.product.name} size="md" />

      <div className="min-w-0">
        <p className="line-clamp-2 font-semibold leading-snug text-slate-900 md:line-clamp-1">{batch.product.name}</p>
        <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-sm md:hidden">
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
            <span className={`h-2 w-2 shrink-0 rounded-full ${s.dot}`} aria-hidden="true" />
            <span className={batch.semaphore === 'red' ? 'font-semibold text-red-700' : 'font-medium text-amber-700'}>
              {describeDays(batch.daysToExpiry)}
            </span>
          </span>
          <span className="whitespace-nowrap text-slate-500">· {batch.quantity} un.</span>
        </p>
        <p className="hidden truncate text-sm text-slate-500 md:block">
          {batch.product.brand ? `${batch.product.brand} · ` : ''}Val. {formatDateBR(batch.expiryDate)}
        </p>
      </div>

      {/* Desktop: colunas Dias e Quantidade */}
      <p className="hidden items-center gap-2 text-sm md:flex">
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${s.dot}`} aria-hidden="true" />
        <span className={batch.semaphore === 'red' ? 'font-semibold text-red-700' : 'font-medium text-amber-700'}>
          {describeDays(batch.daysToExpiry)}
        </span>
      </p>
      <p className="hidden text-right text-sm tabular-nums text-slate-700 md:block">{batch.quantity} un.</p>

      <div className="text-right">
        <p className={`font-bold tabular-nums ${batch.semaphore === 'red' ? 'text-red-700' : 'text-slate-900'}`}>
          {brl(batch.valueAtRisk)}
        </p>
        <p className="whitespace-nowrap text-[11px] leading-tight text-slate-500 md:text-xs">prejuízo potencial</p>
      </div>

      <div className={`col-span-3 md:col-span-1 ${canPromo || batch.expired ? '' : 'hidden md:block'}`}>
        {canPromo && (
          <button
            type="button"
            onClick={() => onPromo(batch)}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-red-600 font-semibold text-white shadow-sm active:bg-red-700 md:h-10 md:text-sm md:hover:bg-red-700"
          >
            <span aria-hidden="true">💸</span> Gerar promoção
          </button>
        )}
        {batch.expired && (
          <p className="whitespace-nowrap rounded-2xl bg-slate-900 px-3 py-2.5 text-center text-sm font-semibold text-white md:py-2">
            ⛔ Retire da venda
          </p>
        )}
      </div>
    </li>
  );
}
