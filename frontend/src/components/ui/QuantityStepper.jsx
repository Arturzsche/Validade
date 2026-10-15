import { useId } from 'react';

const MAX = 100_000;
const clamp = (n) => Math.min(MAX, Math.max(0, n));

/** − [ 12 ] +  com atalhos de caixa fechada. Botões de 56px para uso com o polegar. */
export default function QuantityStepper({ value, onChange, label = 'Quantidade', presets = [6, 12, 24], error }) {
  const id = useId();
  const btn =
    'grid h-14 w-16 shrink-0 place-items-center rounded-2xl bg-amber-100 text-3xl font-black text-amber-900 shadow-[0_3px_0_#fcd34d] transition-all active:translate-y-[2px] active:shadow-none disabled:opacity-40 motion-safe:md:hover:scale-105';

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-bold text-stone-700">
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
          className="h-14 min-w-0 flex-1 rounded-2xl border-0 bg-white text-center text-2xl font-black tabular-nums ring-2 ring-stone-200 focus:ring-emerald-400 focus:outline-none aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-red-500"
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
            className={`h-10 flex-1 rounded-full text-sm font-extrabold transition-all motion-safe:active:scale-95 ${
              value === n ? 'bg-emerald-500 text-white shadow-[0_3px_0_#047857]' : 'bg-white text-stone-600 ring-2 ring-stone-200 md:hover:ring-stone-300'
            }`}
          >
            <span aria-hidden="true">📦</span> {n} un.
          </button>
        ))}
      </div>
      {error && <p className="mt-1.5 text-sm font-medium text-red-600">{error}</p>}
    </div>
  );
}
