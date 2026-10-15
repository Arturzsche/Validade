import { useEffect } from 'react';
import { createPortal } from 'react-dom';

const tones = {
  success: 'bg-emerald-500 text-white shadow-[0_4px_0_#047857]',
  warning: 'bg-amber-300 text-amber-950 shadow-[0_4px_0_#d97706]',
  error: 'bg-rose-500 text-white shadow-[0_4px_0_#be123c]',
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
        className={`animate-toast-in pointer-events-auto w-full max-w-md rounded-3xl px-5 py-3.5 ${tones[toast.tone ?? 'info']}`}
      >
        <p className="font-extrabold">{toast.title}</p>
        {toast.message && <p className="mt-0.5 text-sm opacity-90">{toast.message}</p>}
      </div>
    </div>,
    document.body,
  );
}
