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
              className={`flex flex-col items-center gap-1 rounded-xl px-1 py-2.5 text-xs font-medium transition-colors duration-150 ${
                selected
                  ? `${c.tile} ${c.text} ring-2 `
                  : 'bg-white text-stone-600 ring-1 ring-inset ring-stone-200 hover:bg-stone-50'
              }`}
            >
              <span className="text-xl leading-none" aria-hidden="true">
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
