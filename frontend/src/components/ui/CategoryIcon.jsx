import { productCategory } from '../../lib/productCategory.js';

// Ladrilho colorido e forte por categoria (substitui a caixa cinza quando não há foto).
const TILES = {
  pharmacy: 'bg-rose-100 text-rose-600',
  pet: 'bg-orange-100 text-orange-600',
  dairy: 'bg-sky-100 text-sky-600',
  bakery: 'bg-amber-100 text-amber-700',
  drinks: 'bg-cyan-100 text-cyan-700',
  produce: 'bg-lime-100 text-lime-700',
  cleaning: 'bg-violet-100 text-violet-600',
  generic: 'bg-slate-800 text-white',
};

const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };

const ICONS = {
  pharmacy: (
    <g {...stroke}>
      <path d="M8 6h8v3H8z" />
      <path d="M7 9h10v10a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2z" />
      <path d="M12 12.5v5M9.5 15h5" />
    </g>
  ),
  pet: (
    <g fill="currentColor">
      <ellipse cx="6.5" cy="10" rx="1.9" ry="2.3" />
      <ellipse cx="10" cy="6.5" rx="1.9" ry="2.4" />
      <ellipse cx="14.5" cy="6.5" rx="1.9" ry="2.4" />
      <ellipse cx="18" cy="10" rx="1.9" ry="2.3" />
      <path d="M12.2 11.5c-2.6 0-5.2 3.6-5.2 5.9 0 1.6 1.2 2.6 2.6 2.6 1 0 1.6-.6 2.6-.6s1.6.6 2.6.6c1.4 0 2.6-1 2.6-2.6 0-2.3-2.6-5.9-5.2-5.9Z" />
    </g>
  ),
  dairy: (
    <g {...stroke}>
      <path d="M9 3h6v3l3 4v10a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V10l3-4z" />
      <path d="M6 10h12M15 6l3 4" />
      <path d="M10 14.5c.8.8 3.2.8 4 0" />
    </g>
  ),
  bakery: (
    <g {...stroke}>
      <path d="M5 11a4 4 0 0 1 1.5-7h11A4 4 0 0 1 19 11v8a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1z" />
      <path d="M9.5 8 8.5 10.5M13 8l-1 2.5M16.5 8l-1 2.5" />
    </g>
  ),
  drinks: (
    <g {...stroke}>
      <path d="M10 2.5h4V5l2 3.5V20a1.5 1.5 0 0 1-1.5 1.5h-5A1.5 1.5 0 0 1 8 20V8.5L10 5z" />
      <path d="M8 12h8v4.5H8z" />
    </g>
  ),
  produce: (
    <g {...stroke}>
      <path d="M12 8c-2.2-1.8-7-1.3-7 4.2 0 4 3 8.8 5.2 8.8.9 0 1.2-.5 1.8-.5s.9.5 1.8.5C16 21 19 16.2 19 12.2 19 6.7 14.2 6.2 12 8Z" />
      <path d="M12 8c0-2 .8-3.6 2.6-4.5" />
    </g>
  ),
  cleaning: (
    <g {...stroke}>
      <path d="M8.5 10h6.5v10a1 1 0 0 1-1 1H9.5a1 1 0 0 1-1-1z" />
      <path d="M10 10V7h4v3M14 7.5h3.5l1 1.5M11.5 7V4.5h2" />
      <path d="M19.5 5.5h.01M20.5 8h.01" />
    </g>
  ),
  generic: (
    <g fill="currentColor">
      <rect x="4" y="5" width="1.6" height="14" rx=".4" />
      <rect x="7" y="5" width="0.9" height="14" rx=".3" />
      <rect x="9.2" y="5" width="2" height="14" rx=".4" />
      <rect x="12.6" y="5" width="0.9" height="14" rx=".3" />
      <rect x="14.8" y="5" width="1.6" height="14" rx=".4" />
      <rect x="17.6" y="5" width="0.9" height="14" rx=".3" />
      <rect x="19.6" y="5" width="0.6" height="14" rx=".3" />
    </g>
  ),
};

/** Ícone de mercadoria escolhido pelo nome do produto. */
export default function CategoryIcon({ name, className }) {
  const category = productCategory(name);
  return (
    <div className={`grid shrink-0 place-items-center ${TILES[category]} ${className}`} data-category={category} aria-hidden="true">
      <svg viewBox="0 0 24 24" className="h-[58%] w-[58%]">
        {ICONS[category]}
      </svg>
    </div>
  );
}
