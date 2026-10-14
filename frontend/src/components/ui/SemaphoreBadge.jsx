export const semaphoreStyles = {
  red: { dot: 'bg-red-500', chip: 'bg-red-50 text-red-700 ring-red-200', label: 'Risco' },
  yellow: { dot: 'bg-amber-400', chip: 'bg-amber-50 text-amber-800 ring-amber-200', label: 'Atenção' },
  green: { dot: 'bg-emerald-500', chip: 'bg-emerald-50 text-emerald-700 ring-emerald-200', label: 'Seguro' },
};

export function describeDays(days) {
  if (days < 0) return `Venceu há ${-days} dia${days === -1 ? '' : 's'}`;
  if (days === 0) return 'Vence hoje';
  if (days === 1) return 'Vence amanhã';
  return `Vence em ${days} dias`;
}

export default function SemaphoreBadge({ semaphore, days, className = '' }) {
  const s = semaphoreStyles[semaphore];
  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ring-1 ${s.chip} ${className}`}>
      <span className={`h-2.5 w-2.5 rounded-full ${s.dot}`} aria-hidden="true" />
      {s.label}
      {days !== undefined && <span className="font-normal">· {describeDays(days)}</span>}
    </span>
  );
}
