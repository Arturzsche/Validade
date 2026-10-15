import { useState } from 'react';

const sizes = {
  sm: 'h-10 w-10 rounded-lg',
  md: 'h-14 w-14 rounded-xl',
  lg: 'h-20 w-20 rounded-2xl',
};

/** Foto do produto com fallback para ícone de caixa (produto sem foto ou link quebrado). */
export default function ProductThumb({ src, name, size = 'lg' }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className={`grid shrink-0 place-items-center bg-slate-100 text-slate-400 ${sizes[size]}`} aria-hidden="true">
        <svg viewBox="0 0 24 24" className="h-1/2 w-1/2" fill="none" stroke="currentColor" strokeWidth="1.6">
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
      loading="lazy"
      onError={() => setFailed(true)}
      className={`shrink-0 bg-white object-contain ring-1 ring-slate-200 ${sizes[size]}`}
    />
  );
}
