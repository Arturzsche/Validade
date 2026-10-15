import { useId } from 'react';

const MAX = 100_000;
const clamp = (n) => Math.min(MAX, Math.max(0, n));

/** − [ 12 ] +  com atalhos de caixa fechada. Botões de 56px para uso com o polegar. */
export default function QuantityStepper({ value, onChange, label = 'Quantidade', presets = [6, 12, 24], error }) {
  const id = useId();
  const btn =
    'grid h-14 w-16 shrink-0 place-items-center rounded-xl bg-white text-2xl font-medium text-stone-700 ring-1 ring-inset ring-stone-300 transition-colors hover:bg-stone-50 active:bg-stone-100 disabled:opacity-40';

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-stone-700">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <button type="button" className={btn} onClick={() => onChange(clamp((value || 0) - 1))} disabled={!value || value <= 1} aria-label="Diminuir">
          −
        </button>
        <input
          id={id}
          inputMode="numeric"
          pattern="[0-9]*"
          value={value ?? ''}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, '');
            onChange(digits ? clamp(Number(digits)) : null);
          }}
          onFocus={(e) => e.target.select()}
          aria-invalid={Boolean(error)}
          className="h-14 min-w-0 flex-1 rounded-xl border-0 bg-white text-center text-2xl font-semibold tabular-nums ring-1 ring-inset ring-stone-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-red-500"
        />
        <button type="button" className={btn} onClick={() => onChange(clamp((value || 0) + 1))} aria-label="Aumentar">
          +
        </button>
      </div>
      <div className="mt-2 flex gap-2">
        {presets.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`h-10 flex-1 rounded-lg text-sm font-medium transition-colors ${
              value === n ? 'bg-stone-900 text-white' : 'bg-white text-stone-600 ring-1 ring-inset ring-stone-300 hover:bg-stone-50'
            }`}
          >
            {n} un.
          </button>
        ))}
      </div>
      {error && <p className="mt-1.5 text-sm font-medium text-red-600">{error}</p>}
    </div>
  );
}
