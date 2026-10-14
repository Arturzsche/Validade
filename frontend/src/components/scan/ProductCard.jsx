import { useState } from 'react';
import { brl } from '../../lib/money.js';

function ProductImage({ src, name }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl bg-slate-100 text-slate-400" aria-hidden="true">
        <svg viewBox="0 0 24 24" className="h-9 w-9" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M21 8 12 3 3 8v8l9 5 9-5V8z" strokeLinejoin="round" />
          <path d="m3 8 9 5 9-5M12 13v8" strokeLinejoin="round" />
        </svg>
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={name}
      onError={() => setFailed(true)}
      className="h-20 w-20 shrink-0 rounded-2xl bg-white object-contain ring-1 ring-slate-200"
    />
  );
}

/** Confirmação visual do que foi lido: foto + nome, para o operador conferir antes de digitar. */
export default function ProductCard({ product, barcode, isNew, onEdit }) {
  return (
    <div className="flex items-center gap-4 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <ProductImage src={product.imageUrl} name={product.name} />
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
