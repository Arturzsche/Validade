import Spinner from './Spinner.jsx';

// Botões planos, cor sólida e foco visível — padrão de produto SaaS (nada de sombra "3D").
const variants = {
  primary: 'bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800 disabled:bg-emerald-600/50',
  danger: 'bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800 disabled:bg-rose-600/50',
  secondary: 'bg-white text-stone-800 ring-1 ring-inset ring-stone-300 hover:bg-stone-50 active:bg-stone-100 disabled:text-stone-400',
  outline: 'bg-white text-stone-900 ring-1 ring-inset ring-stone-900/80 hover:bg-stone-900 hover:text-white active:bg-stone-800',
  ghost: 'bg-transparent text-stone-600 hover:bg-stone-100 active:bg-stone-200/60',
  dark: 'bg-white/15 text-white backdrop-blur active:bg-white/25',
};

const sizes = {
  lg: 'h-14 px-6 text-base', // alvo de toque confortável para uso com uma mão (56px)
  md: 'h-12 px-5 text-base',
  sm: 'h-10 px-4 text-sm',
};

export default function Button({
  variant = 'primary',
  size = 'lg',
  loading = false,
  block = false,
  className = '',
  children,
  disabled,
  ...props
}) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={`inline-flex select-none items-center justify-center gap-2 rounded-xl font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/30 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${block ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {loading && <Spinner className="h-5 w-5" />}
      {children}
    </button>
  );
}
