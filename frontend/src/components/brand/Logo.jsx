/**
 * Marca iValida: caixa de papelão isométrica (estoque) com etiqueta de desconto
 * acoplada (queima de estoque). Desenhada à mão em SVG para ficar nítida em qualquer tamanho.
 */
export function LogoMark({ className = 'h-9 w-9' }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      {/* tampa */}
      <path d="M24 5 41 13.5 24 22 7 13.5Z" fill="#6ee7b7" />
      {/* lateral esquerda */}
      <path d="M7 13.5 24 22v20L7 33.5Z" fill="#10b981" />
      {/* lateral direita (sombra) */}
      <path d="M41 13.5 24 22v20l17-8.5Z" fill="#047857" />
      {/* fita adesiva da tampa */}
      <path d="M15.5 9.25 32.5 17.75" stroke="#059669" strokeWidth="3" strokeLinecap="round" />
      {/* aresta frontal */}
      <path d="M24 22v20" stroke="#065f46" strokeWidth="0.75" opacity="0.6" />
      {/* etiqueta de preço com % */}
      <g transform="rotate(-18 36 34)">
        <path
          d="M28.5 28h11.2a1.5 1.5 0 0 1 1.1.5l4.6 5a1.5 1.5 0 0 1 0 2l-4.6 5a1.5 1.5 0 0 1-1.1.5H28.5a1.5 1.5 0 0 1-1.5-1.5v-10a1.5 1.5 0 0 1 1.5-1.5Z"
          fill="#facc15"
          stroke="#0f172a"
          strokeWidth="1.4"
        />
        <circle cx="41.2" cy="34.5" r="1.3" fill="#0f172a" />
        <text x="33" y="38.4" textAnchor="middle" fontSize="10" fontWeight="800" fontFamily="system-ui, sans-serif" fill="#0f172a">
          %
        </text>
      </g>
    </svg>
  );
}

/** Marca + nome. `tone="light"` para fundos escuros (cabeçalho). */
export default function Logo({ tone = 'light', className = '', markClassName }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark className={markClassName} />
      <span className={`text-xl font-extrabold tracking-tight ${tone === 'light' ? 'text-white' : 'text-stone-900'}`}>
        <span className="text-emerald-400">i</span>Valida
      </span>
    </span>
  );
}
