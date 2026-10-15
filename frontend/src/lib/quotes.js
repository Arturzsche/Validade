// Status do orçamento: rótulo em português + estilo do selo. Sem vermelho de alerta:
// rejeitado é neutro (cinza), aprovado é verde discreto, pendente é âmbar discreto.
export const QUOTE_STATUS = {
  PENDING: { label: 'Pendente', chip: 'bg-amber-50 text-amber-800 ring-amber-200', dot: 'bg-amber-500' },
  APPROVED: { label: 'Aprovado', chip: 'bg-emerald-50 text-emerald-800 ring-emerald-200', dot: 'bg-emerald-500' },
  REJECTED: { label: 'Rejeitado', chip: 'bg-slate-100 text-slate-600 ring-slate-200', dot: 'bg-slate-400' },
};

/** 0.666… -> "67%" */
export const formatRate = (rate) => (rate === null ? '—' : `${Math.round(rate * 100)}%`);

export const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
