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
    <div className="motion-safe:animate-pop-in rounded-3xl bg-white p-4 shadow-card ring-1 ring-stone-900/5">
      <div className="flex items-center gap-4">
        <ProductThumb product={product} previewSrc={previewSrc} />
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap gap-1.5">
            {isNew && (
              <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-extrabold text-sky-700">✨ Novo</span>
            )}
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${cat.tile} ${cat.text}`}>
              {cat.emoji} {cat.label}
            </span>
          </div>
          <p className="line-clamp-2 text-lg font-extrabold leading-tight text-stone-900">{product.name}</p>
          {product.brand && <p className="truncate text-sm text-stone-500">{product.brand}</p>}
          <p className="mt-1 text-sm text-stone-500 tabular-nums">
            {barcode}
            {product.price != null && <span className="font-bold text-stone-700"> · {brl(product.price)}</span>}
          </p>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-dashed border-stone-200 pt-3">
        {onPhoto && <PhotoButton onPhoto={onPhoto} hasPhoto={hasPhoto} busy={photoBusy} />}
        {isNew && onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="h-10 shrink-0 rounded-full px-4 text-sm font-bold text-sky-700 transition-transform motion-safe:active:scale-95 md:hover:bg-sky-50"
          >
            ✏️ Editar
          </button>
        )}
      </div>
    </div>
  );
}
