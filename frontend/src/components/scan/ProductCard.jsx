import ProductThumb from '../ui/ProductThumb.jsx';
import PhotoButton from '../ui/PhotoButton.jsx';
import { brl } from '../../lib/money.js';
import { categoryInfo } from '../../lib/categories.js';

/**
 * Confirmação visual do que foi lido: foto (ou emoji da categoria) + nome, para o operador
 * conferir antes de digitar. "Tirar foto" troca o emoji pela embalagem de verdade.
 */
export default function ProductCard({ product, barcode, isNew, onEdit, onPhoto, previewSrc, photoBusy }) {
  const cat = categoryInfo(product.category);
  const hasPhoto = Boolean(previewSrc || product.photoVersion || product.imageUrl);
  return (
    <div className="rounded-2xl bg-white p-4 shadow-card ring-1 ring-stone-200">
      <div className="flex items-center gap-4">
        <ProductThumb product={product} previewSrc={previewSrc} />
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap gap-1.5">
            {isNew && (
              <span className="rounded-md bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-700">Novo</span>
            )}
            <span className={`rounded-md bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600`}>
              {cat.label}
            </span>
          </div>
          <p className="line-clamp-2 text-lg font-semibold leading-tight text-stone-900">{product.name}</p>
          {product.brand && <p className="truncate text-sm text-stone-500">{product.brand}</p>}
          <p className="mt-1 text-sm text-stone-500 tabular-nums">
            {barcode}
            {product.price != null && <span className="font-medium text-stone-700"> · {brl(product.price)}</span>}
          </p>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-stone-100 pt-3">
        {onPhoto && <PhotoButton onPhoto={onPhoto} hasPhoto={hasPhoto} busy={photoBusy} />}
        {isNew && onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="h-10 shrink-0 rounded-lg px-3 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-100"
          >
            Editar cadastro
          </button>
        )}
      </div>
    </div>
  );
}
