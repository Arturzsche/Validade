import { useEffect } from 'react';
import { createPortal } from 'react-dom';

const tones = {
  success: 'bg-stone-900 text-white shadow-pop border-l-4 border-emerald-400',
  warning: 'bg-stone-900 text-white shadow-pop border-l-4 border-amber-400',
  error: 'bg-stone-900 text-white shadow-pop border-l-4 border-rose-500',
  info: 'bg-stone-800 text-white',
};

/** Aviso no topo da tela que some sozinho (não bloqueia a próxima leitura). */
export default function Toast({ toast, onDismiss, duration = 3500 }) {
  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(onDismiss, duration);
    return () => clearTimeout(t);
  }, [toast, onDismiss, duration]);

  if (!toast) return null;

  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex justify-center px-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
      <div
        role="status"
        aria-live="polite"
        onClick={onDismiss}
        className={`animate-toast-in pointer-events-auto w-full max-w-md rounded-xl px-5 py-3.5 ${tones[toast.tone ?? 'info']}`}
      >
        <p className="font-semibold">{toast.title}</p>
        {toast.message && <p className="mt-0.5 text-sm opacity-90">{toast.message}</p>}
      </div>
    </div>,
    document.body,
  );
}
