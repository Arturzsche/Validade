import ProductThumb from '../ui/ProductThumb.jsx';
import { brl } from '../../lib/money.js';

function IconButton({ label, onClick, children, tone = 'slate' }) {
  const tones = {
    slate: 'text-stone-600 active:bg-stone-100 md:hover:bg-stone-100 md:hover:text-stone-900',
    red: 'text-stone-500 active:bg-red-50 md:hover:bg-red-50 md:hover:text-red-600',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`grid h-10 w-10 place-items-center rounded-lg transition-colors ${tones[tone]}`}
    >
      {children}
    </button>
  );
}

/** Linha do catálogo: produto, código de barras, preço e ações (editar; excluir só para o dono). */
export default function CatalogItem({ product, onEdit, onDelete }) {
  const onShelf = product.activeBatches > 0;
  return (
    <li className="flex items-center gap-3 px-4 py-3 transition-colors sm:gap-4 sm:px-5 md:hover:bg-stone-50">
      <ProductThumb product={product} size="sm" />

      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 font-medium leading-snug text-stone-900 sm:line-clamp-1">{product.name}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-stone-500">
          <span className="text-sm font-semibold tabular-nums text-stone-900">{brl(product.price)}</span>
          {product.costPrice != null && <span className="whitespace-nowrap">custo {brl(product.costPrice)}</span>}
          <span className="font-mono tracking-tight">{product.barcode}</span>
          {onShelf && (
            <span className="whitespace-nowrap rounded-md bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600">
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
        {onDelete && (
          <IconButton label={`Excluir ${product.name}`} onClick={() => onDelete(product)} tone="red">
            <svg viewBox="0 0 20 20" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
              <path d="M3.5 5.5h13M8 5.5V4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1.5M5.5 5.5l.7 10a1.5 1.5 0 0 0 1.5 1.4h4.6a1.5 1.5 0 0 0 1.5-1.4l.7-10" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </IconButton>
        )}
      </div>
    </li>
  );
}
