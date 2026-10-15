import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useWhatsAppStatus } from '../../hooks/useWhatsAppStatus.js';
import WhatsAppStatusBadge from '../whatsapp/WhatsAppStatusBadge.jsx';
import WhatsAppModal from '../whatsapp/WhatsAppModal.jsx';
import Logo from '../brand/Logo.jsx';

/** Abas por papel: o operador (balcão/estoque) não vê o Painel financeiro. */
const NAV = [
  { to: '/painel', label: 'Painel', icon: ChartIcon, roles: ['OWNER'] },
  { to: '/entrada', label: 'Entrada', icon: ScanIcon, roles: ['OWNER', 'OPERATOR'] },
  { to: '/catalogo', label: 'Catálogo', icon: ListIcon, roles: ['OWNER', 'OPERATOR'] },
];


/** Moldura das telas logadas: cabeçalho branco fixo + abas (rodapé no celular, cabeçalho no desktop). */
export default function AppShell({ title, actions, children }) {
  const { session, logout } = useAuth();
  const isOwner = session.user.role === 'OWNER';
  const nav = NAV.filter((n) => n.roles.includes(session.user.role));
  const whatsapp = useWhatsAppStatus({ enabled: isOwner });
  const [whatsAppOpen, setWhatsAppOpen] = useState(false);

  useEffect(() => {
    document.title = `${title} · iValida`;
  }, [title]);

  return (
    <div className="min-h-dvh pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0">
      <header className="sticky top-0 z-30 bg-white pt-[env(safe-area-inset-top)] shadow-header">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4">
          <div className="flex min-w-0 items-center gap-3">
            <Logo tone="dark" markClassName="h-8 w-8 shrink-0" className="shrink-0" />
            <span className="hidden h-5 w-px bg-stone-200 sm:block" aria-hidden="true" />
            <p className="hidden truncate text-sm font-medium text-stone-500 sm:block">{title}</p>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <nav className="mr-2 hidden gap-1 md:flex" aria-label="Principal">
              {nav.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors ${
                      isActive ? 'bg-stone-100 text-stone-900' : 'text-stone-500 hover:bg-stone-50 hover:text-stone-900'
                    }`
                  }
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </NavLink>
              ))}
            </nav>
            {isOwner && <WhatsAppStatusBadge level={whatsapp.level} onClick={() => setWhatsAppOpen(true)} />}
            {actions}
            <button
              type="button"
              onClick={logout}
              className="h-9 rounded-lg px-3 text-sm font-medium text-stone-500 transition-colors active:bg-stone-100 md:hover:bg-stone-100 md:hover:text-stone-900"
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

      {/* Celular: barra de abas fixa no rodapé, ao alcance do polegar */}
      <nav
        aria-label="Principal"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-stone-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <div className={`mx-auto grid h-16 max-w-md ${nav.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1 text-xs font-medium transition-colors ${
                  isActive ? 'text-emerald-700' : 'text-stone-500 active:bg-stone-50'
                }`
              }
            >
              <Icon className="h-6 w-6" />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}

function ChartIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ScanIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" strokeLinecap="round" />
      <path d="M7 8v8M10 8v8M13 8v8M17 8v8" strokeLinecap="round" />
    </svg>
  );
}

function ListIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M8 8h8M8 12h8M8 16h5" strokeLinecap="round" />
    </svg>
  );
}
