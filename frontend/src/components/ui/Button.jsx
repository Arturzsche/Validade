import Spinner from './Spinner.jsx';

const variants = {
  primary: 'bg-emerald-600 text-white active:bg-emerald-700 disabled:bg-emerald-600/50',
  danger: 'bg-red-600 text-white active:bg-red-700 disabled:bg-red-600/50',
  secondary: 'bg-white text-slate-900 ring-1 ring-slate-300 active:bg-slate-100 disabled:text-slate-400',
  ghost: 'bg-transparent text-slate-700 active:bg-slate-200/70',
  dark: 'bg-white/15 text-white backdrop-blur active:bg-white/25',
};

const sizes = {
  lg: 'h-14 px-6 text-lg', // alvo de toque confortável para uso com uma mão
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
      className={`inline-flex select-none items-center justify-center gap-2 rounded-2xl font-semibold transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/40 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${block ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {loading && <Spinner className="h-5 w-5" />}
      {children}
    </button>
  );
}
