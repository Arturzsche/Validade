import { useState } from 'react';
import CategoryIcon from './CategoryIcon.jsx';

const sizes = {
  sm: 'h-10 w-10 rounded-lg',
  md: 'h-14 w-14 rounded-xl',
  lg: 'h-20 w-20 rounded-2xl',
};

/** Foto do produto; sem foto (ou link quebrado), um ícone de mercadoria pela categoria do nome. */
export default function ProductThumb({ src, name, size = 'lg' }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <CategoryIcon name={name} className={sizes[size]} />;
  return (
    <img
      src={src}
      alt={name}
      loading="lazy"
      onError={() => setFailed(true)}
      className={`shrink-0 bg-white object-contain ring-1 ring-slate-200 ${sizes[size]}`}
    />
  );
}
