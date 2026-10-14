import { LEVELS } from '../../lib/whatsapp.js';

/** Indicador do cabeçalho. Clicável: abre o modal de conexão. */
export default function WhatsAppStatusBadge({ level, onClick }) {
  const s = LEVELS[level];
  const alarming = level === 'disconnected';
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`WhatsApp: ${s.label}. Abrir detalhes da conexão`}
      className={`inline-flex h-9 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold ring-1 transition-colors active:brightness-125 md:hover:brightness-125 ${s.chip}`}
    >
      <WhatsAppGlyph />
      <span className="relative flex h-2 w-2" aria-hidden="true">
        {alarming && <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${s.dot} opacity-75`} />}
        <span className={`relative inline-flex h-2 w-2 rounded-full ${s.dot}`} />
      </span>
      <span className="hidden min-[360px]:inline">{s.label}</span>
    </button>
  );
}

function WhatsAppGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.3-.2-.5-.3z" />
    </svg>
  );
}
