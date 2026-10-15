import { CATEGORIES } from '../../lib/categories.js';

/** Escolha da categoria com um toque: 5 botões grandes com emoji. */
export default function CategoryPicker({ value, onChange, label = 'Categoria' }) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-bold text-stone-700">{label}</legend>
      <div role="radiogroup" aria-label={label} className="grid grid-cols-5 gap-2">
        {CATEGORIES.map((c) => {
          const selected = value === c.value;
          return (
            <button
              key={c.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(c.value)}
              className={`flex flex-col items-center gap-1 rounded-2xl px-1 py-2.5 text-xs font-bold transition-all duration-150 motion-safe:active:scale-95 ${
                selected
                  ? `${c.tile} ${c.text} ring-2 ${c.ring} motion-safe:scale-105 shadow-sm`
                  : 'bg-stone-100 text-stone-600 md:hover:bg-stone-200'
              }`}
            >
              <span className={`text-2xl leading-none ${selected ? 'motion-safe:animate-wiggle' : ''}`} aria-hidden="true">
                {c.emoji}
              </span>
              {c.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
