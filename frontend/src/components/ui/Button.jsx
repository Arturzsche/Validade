import Spinner from './Spinner.jsx';

// Botões planos, cor sólida e foco visível — padrão de produto SaaS (nada de sombra "3D").
const variants = {
  primary: 'bg-navy-800 text-white hover:bg-navy-900 active:bg-navy-950 disabled:bg-navy-800/50',
  danger: 'bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800 disabled:bg-rose-600/50',
  secondary: 'bg-white text-slate-800 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 active:bg-slate-100 disabled:text-slate-400',
  outline: 'bg-white text-navy-800 ring-1 ring-inset ring-navy-800 hover:bg-navy-50 active:bg-navy-100',
  ghost: 'bg-transparent text-slate-600 hover:bg-slate-100 active:bg-slate-200/60',
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
      className={`inline-flex select-none items-center justify-center gap-2 rounded-xl font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-navy-500/30 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${block ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {loading && <Spinner className="h-5 w-5" />}
      {children}
    </button>
  );
}
