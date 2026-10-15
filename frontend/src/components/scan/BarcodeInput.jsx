import { forwardRef, useState } from 'react';

/**
 * Campo fixo de código de barras no topo da Entrada. Funciona com leitor USB/Bluetooth
 * (que "digita" o código e aperta Enter) e com digitação manual. Limpa sozinho a cada envio.
 */
const BarcodeInput = forwardRef(function BarcodeInput({ onSubmit, busy }, ref) {
  const [value, setValue] = useState('');
  const [error, setError] = useState(null);

  function submit(e) {
    e.preventDefault();
    const code = value.replace(/\D/g, '');
    if (code.length < 6 || code.length > 14) {
      setError(value ? 'Código inválido: use de 6 a 14 números' : null);
      return;
    }
    setError(null);
    setValue('');
    onSubmit(code);
  }

  return (
    <form onSubmit={submit} role="search" aria-label="Buscar produto pelo código">
      <div className="flex gap-2">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Código de barras</span>
          <BarcodeIcon />
          <input
            ref={ref}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setError(null);
            }}
            inputMode="numeric"
            autoComplete="off"
            enterKeyHint="go"
            placeholder="Código de barras"
            aria-invalid={Boolean(error)}
            className="h-12 w-full rounded-xl border-0 bg-white pr-3 pl-11 text-lg font-medium tabular-nums text-stone-900 ring-1 ring-inset ring-stone-300 placeholder:font-normal placeholder:text-stone-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none aria-[invalid=true]:ring-red-500"
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="h-12 shrink-0 rounded-xl bg-stone-900 px-4 text-sm font-semibold text-white transition-colors hover:bg-stone-800 disabled:opacity-50"
        >
          Buscar
        </button>
      </div>
      {error && <p className="mt-1.5 text-sm font-medium text-red-600">{error}</p>}
    </form>
  );
});

export default BarcodeInput;

const BarcodeIcon = () => (
  <svg
    viewBox="0 0 24 24"
    className="pointer-events-none absolute top-1/2 left-3.5 h-5 w-5 -translate-y-1/2 text-stone-400"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    aria-hidden="true"
  >
    <path d="M4 6v12M7 6v12M11 6v12M14 6v12M17 6v12M20 6v12" strokeLinecap="round" />
  </svg>
);
