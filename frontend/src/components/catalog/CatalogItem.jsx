import ProductThumb from '../ui/ProductThumb.jsx';
import { brl } from '../../lib/money.js';

function IconButton({ label, onClick, children, tone = 'slate' }) {
  const tones = {
    slate: 'text-slate-600 active:bg-slate-100 md:hover:bg-slate-100 md:hover:text-slate-900',
    red: 'text-slate-500 active:bg-red-50 md:hover:bg-red-50 md:hover:text-red-600',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`grid h-9 w-9 place-items-center rounded-lg transition-colors ${tones[tone]}`}
    >
      {children}
    </button>
  );
}

/** Linha do catálogo: produto, código de barras, preço e ações (editar/excluir). */
export default function CatalogItem({ product, onEdit, onDelete }) {
  const onShelf = product.activeBatches > 0;
  return (
    <li className="flex items-center gap-3 px-4 py-3 sm:gap-4 sm:px-5">
      <ProductThumb src={product.imageUrl} name={product.name} size="sm" />

      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 font-medium leading-snug text-slate-900 sm:line-clamp-1">{product.name}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-slate-500">
          <span className="text-sm font-semibold tabular-nums text-slate-900">{brl(product.price)}</span>
          {product.costPrice != null && <span className="whitespace-nowrap">custo {brl(product.costPrice)}</span>}
          <span className="font-mono tracking-tight">{product.barcode}</span>
          {onShelf && (
            <span className="whitespace-nowrap rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
              {product.activeBatches} na prateleira
            </span>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center">
        <IconButton label={`Editar ${product.name}`} onClick={() => onEdit(product)}>
          <svg viewBox="0 0 20 20" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
            <path d="M13.6 3.4a2 2 0 0 1 2.9 2.9L7 15.8l-3.6.8.8-3.6 9.4-9.6Z" strokeLinejoin="round" />
          </svg>
        </IconButton>
        <IconButton label={`Excluir ${product.name}`} onClick={() => onDelete(product)} tone="red">
          <svg viewBox="0 0 20 20" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
            <path d="M3.5 5.5h13M8 5.5V4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1.5M5.5 5.5l.7 10a1.5 1.5 0 0 0 1.5 1.4h4.6a1.5 1.5 0 0 0 1.5-1.4l.7-10" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </IconButton>
      </div>
    </li>
  );
}
