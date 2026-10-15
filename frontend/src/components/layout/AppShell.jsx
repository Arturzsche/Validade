import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useWhatsAppStatus } from '../../hooks/useWhatsAppStatus.js';
import WhatsAppStatusBadge from '../whatsapp/WhatsAppStatusBadge.jsx';
import WhatsAppModal from '../whatsapp/WhatsAppModal.jsx';
import Logo from '../brand/Logo.jsx';

const NAV = [
  { to: '/painel', label: 'Painel', icon: GaugeIcon },
  { to: '/entrada', label: 'Entrada', icon: ScanIcon },
  { to: '/catalogo', label: 'Catálogo', icon: CatalogIcon },
];

const widths = { md: 'max-w-md', wide: 'max-w-5xl' };

/**
 * Moldura das telas logadas. O dono navega entre Painel e Entrada
 * (abas no rodapé no celular, links no cabeçalho no desktop); o operador só usa a Entrada.
 */
export default function AppShell({ title, actions, width = 'md', children }) {
  const { session, logout } = useAuth();
  const isOwner = session.user.role === 'OWNER';
  const whatsapp = useWhatsAppStatus({ enabled: isOwner });
  const [whatsAppOpen, setWhatsAppOpen] = useState(false);

  useEffect(() => {
    document.title = `${title} · iValida`;
  }, [title]);

  return (
    <div className={`min-h-dvh ${isOwner ? 'pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0' : ''}`}>
      <header className="sticky top-0 z-30 bg-slate-900 pt-[env(safe-area-inset-top)] text-white">
        <div className={`mx-auto flex h-16 items-center justify-between gap-3 px-4 ${widths[width]}`}>
          <div className="flex min-w-0 items-center gap-3">
            <Logo markClassName="h-8 w-8 shrink-0" className="shrink-0" />
            {/* Título da página no cabeçalho só onde há espaço; no celular ele vai para o conteúdo */}
            <span className="hidden h-6 w-px bg-white/15 sm:block" aria-hidden="true" />
            <p className="hidden truncate text-sm font-medium text-slate-300 sm:block">{title}</p>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            {isOwner && (
              <nav className="mr-2 hidden gap-1 md:flex" aria-label="Principal">
                {NAV.map(({ to, label }) => (
                  <NavLink
                    key={to}
                    to={to}
                    className={({ isActive }) =>
                      `rounded-xl px-3 py-2 text-sm font-semibold ${isActive ? 'bg-white/15 text-white' : 'text-slate-300 hover:bg-white/10'}`
                    }
                  >
                    {label}
                  </NavLink>
                ))}
              </nav>
            )}
            {isOwner && <WhatsAppStatusBadge level={whatsapp.level} onClick={() => setWhatsAppOpen(true)} />}
            {actions}
            <button
              type="button"
              onClick={logout}
              className="h-10 rounded-xl px-3 text-sm font-semibold text-slate-300 active:bg-white/10 md:hover:bg-white/10"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      {children}

      {isOwner && (
        <WhatsAppModal
          open={whatsAppOpen}
          onClose={() => setWhatsAppOpen(false)}
          status={whatsapp.status}
          onStatus={whatsapp.setStatus}
        />
      )}

      {isOwner && (
        <nav
          aria-label="Principal"
          className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
        >
          <div className="mx-auto grid h-[4.5rem] max-w-md grid-cols-3">
            {NAV.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center gap-1 text-xs font-semibold ${isActive ? 'text-emerald-700' : 'text-slate-500'}`
                }
              >
                <Icon />
                {label}
              </NavLink>
            ))}
          </div>
        </nav>
      )}
    </div>
  );
}

function GaugeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M3 13a9 9 0 0 1 18 0" strokeLinecap="round" />
      <path d="M12 13l4-4" strokeLinecap="round" />
      <circle cx="12" cy="13" r="1.5" fill="currentColor" />
      <path d="M5 19h14" strokeLinecap="round" />
    </svg>
  );
}

function ScanIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3" strokeLinecap="round" />
      <path d="M8 8v8M11 8v8M14 8v8M17 8v8" strokeLinecap="round" />
    </svg>
  );
}

function CatalogIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M4 7h1M4 12h1M4 17h1M9 7h11M9 12h11M9 17h11" strokeLinecap="round" />
    </svg>
  );
}
