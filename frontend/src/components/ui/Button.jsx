import Spinner from './Spinner.jsx';

// Botões "fofos": sombra sólida embaixo dá volume; ao tocar, o botão afunda (translate + sombra menor).
const variants = {
  primary:
    'bg-emerald-500 text-white shadow-[0_4px_0_#047857] active:translate-y-[3px] active:shadow-[0_1px_0_#047857] disabled:bg-emerald-500/50 disabled:shadow-none md:hover:bg-emerald-400',
  danger:
    'bg-rose-500 text-white shadow-[0_4px_0_#be123c] active:translate-y-[3px] active:shadow-[0_1px_0_#be123c] disabled:bg-rose-500/50 disabled:shadow-none md:hover:bg-rose-400',
  secondary:
    'bg-white text-stone-800 ring-2 ring-stone-200 shadow-[0_3px_0_#e7e5e4] active:translate-y-[2px] active:shadow-none disabled:text-stone-400 md:hover:ring-stone-300',
  ghost: 'bg-transparent text-stone-600 active:bg-stone-200/60 md:hover:bg-stone-100',
  dark: 'bg-white/15 text-white backdrop-blur active:bg-white/25',
};

const sizes = {
  lg: 'h-14 px-6 text-lg', // alvo de toque confortável para uso com uma mão (56px)
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
      className={`inline-flex select-none items-center justify-center gap-2 rounded-2xl font-extrabold transition-all duration-150 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-400/40 disabled:cursor-not-allowed motion-safe:md:hover:-translate-y-0.5 motion-safe:md:hover:scale-[1.01] ${variants[variant]} ${sizes[size]} ${block ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {loading && <Spinner className="h-5 w-5" />}
      {children}
    </button>
  );
}
