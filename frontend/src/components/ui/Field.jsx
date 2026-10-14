import { forwardRef, useId } from 'react';

/** Input grande com label, dica e erro. Todos os inputs do app passam por aqui. */
const Field = forwardRef(function Field({ label, hint, error, className = '', inputClassName = '', ...props }, ref) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-slate-700">
        {label}
      </label>
      <input
        ref={ref}
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        className={`h-14 w-full rounded-2xl border-0 bg-slate-50 px-4 text-lg text-slate-900 ring-1 ring-slate-300 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-red-500 ${inputClassName}`}
        {...props}
      />
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-sm font-medium text-red-600">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="mt-1.5 text-sm text-slate-500">
            {hint}
          </p>
        )
      )}
    </div>
  );
});

export default Field;
