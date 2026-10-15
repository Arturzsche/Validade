import { useState } from 'react';
import { categoryInfo, fallbackEmoji } from '../../lib/categories.js';
import { productPhotoUrl } from '../../lib/photos.js';

const sizes = {
  sm: { box: 'h-11 w-11 rounded-xl', emoji: 'text-xl' },
  md: { box: 'h-14 w-14 rounded-xl', emoji: 'text-2xl' },
  lg: { box: 'h-16 w-16 rounded-xl', emoji: 'text-3xl' },
};

/**
 * Imagem do produto, na ordem: prévia local (foto recém-tirada) › foto tirada no celular ›
 * foto da base pública › emoji grande da categoria num ladrilho colorido.
 * Se uma imagem falhar ao carregar, passa para a próxima.
 */
export default function ProductThumb({ product, size = 'lg', previewSrc }) {
  const sources = [previewSrc, productPhotoUrl(product), product?.imageUrl].filter(Boolean);
  const [failed, setFailed] = useState(0);
  const src = sources[failed];
  const s = sizes[size];

  if (!src) {
    const info = categoryInfo(product?.category);
    return (
      <div
        className={`grid shrink-0 place-items-center ${info.tile} ${s.box}`}
        data-category={product?.category ?? 'OTHER'}
        aria-hidden="true"
      >
        <span className={`${s.emoji} leading-none`}>{fallbackEmoji(product?.category, product?.name)}</span>
      </div>
    );
  }
  return (
    <img
      key={src}
      src={src}
      alt={product?.name ?? ''}
      loading="lazy"
      onError={() => setFailed((n) => n + 1)}
      className={`shrink-0 bg-white object-cover ring-1 ring-stone-200 ${s.box}`}
    />
  );
}
