import ProductThumb from '../ui/ProductThumb.jsx';
import { brl } from '../../lib/money.js';

/** Confirmação visual do que foi lido: foto + nome, para o operador conferir antes de digitar. */
export default function ProductCard({ product, barcode, isNew, onEdit }) {
  return (
    <div className="flex items-center gap-4 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <ProductThumb src={product.imageUrl} name={product.name} />
      <div className="min-w-0 flex-1">
        {isNew && (
          <span className="mb-1 inline-block rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-sky-700">
            Novo produto
          </span>
        )}
        <p className="truncate text-lg font-bold leading-tight text-slate-900">{product.name}</p>
        {product.brand && <p className="truncate text-sm text-slate-500">{product.brand}</p>}
        <p className="mt-1 text-sm text-slate-500 tabular-nums">
          {barcode}
          {product.price != null && <span className="font-semibold text-slate-700"> · {brl(product.price)}</span>}
        </p>
      </div>
      {isNew && onEdit && (
        <button
          type="button"
          onClick={onEdit}
          className="h-10 shrink-0 rounded-xl px-3 text-sm font-semibold text-sky-700 active:bg-sky-50"
        >
          Editar
        </button>
      )}
    </div>
  );
}
