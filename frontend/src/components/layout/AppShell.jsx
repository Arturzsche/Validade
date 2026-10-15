import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useWhatsAppStatus } from '../../hooks/useWhatsAppStatus.js';
import WhatsAppStatusBadge from '../whatsapp/WhatsAppStatusBadge.jsx';
import WhatsAppModal from '../whatsapp/WhatsAppModal.jsx';
import Logo from '../brand/Logo.jsx';

const NAV = [
  { to: '/painel', label: 'Painel', emoji: '🏪' },
  { to: '/entrada', label: 'Entrada', emoji: '📷' },
  { to: '/catalogo', label: 'Catálogo', emoji: '📒' },
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
    <div className={`min-h-dvh ${isOwner ? 'pb-[calc(6.5rem+env(safe-area-inset-bottom))] md:pb-0' : ''}`}>
      <header className="sticky top-0 z-30 pt-[env(safe-area-inset-top)]">
        <div className="bg-white/90 backdrop-blur">
          <div className={`mx-auto flex h-16 items-center justify-between gap-3 px-4 ${widths[width]}`}>
            <div className="flex min-w-0 items-center gap-3">
              <Logo tone="dark" markClassName="h-9 w-9 shrink-0 motion-safe:hover:animate-wiggle" className="shrink-0" />
              {/* Título da página no cabeçalho só onde há espaço; no celular ele vai para o conteúdo */}
              <span className="hidden h-6 w-0.5 rounded-full bg-amber-200 sm:block" aria-hidden="true" />
              <p className="hidden truncate text-sm font-bold text-stone-500 sm:block">{title}</p>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              {isOwner && (
                <nav className="mr-2 hidden gap-1 rounded-full bg-amber-50 p-1 ring-1 ring-amber-100 md:flex" aria-label="Principal">
                  {NAV.map(({ to, label, emoji }) => (
                    <NavLink
                      key={to}
                      to={to}
                      className={({ isActive }) =>
                        `inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-extrabold transition-all ${
                          isActive ? 'bg-white text-emerald-700 shadow-sm' : 'text-stone-500 hover:text-stone-800'
                        }`
                      }
                    >
                      <span aria-hidden="true">{emoji}</span>
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
                className="h-10 rounded-full px-3 text-sm font-bold text-stone-500 transition-colors active:bg-stone-100 md:hover:bg-stone-100 md:hover:text-stone-800"
              >
                Sair
              </button>
            </div>
          </div>
        </div>
        {/* Toldo listrado da fachada: a "cara" de comércio de bairro */}
        <div className="awning" aria-hidden="true" />
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
          className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-30 md:hidden"
        >
          <div className="mx-auto grid h-[4.25rem] max-w-md grid-cols-3 gap-1 rounded-[1.75rem] bg-white p-1.5 shadow-pop ring-1 ring-stone-900/5">
            {NAV.map(({ to, label, emoji }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center gap-0.5 rounded-[1.4rem] text-xs font-extrabold transition-all duration-200 ${
                    isActive ? 'bg-emerald-100 text-emerald-800' : 'text-stone-500 active:bg-stone-100'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span className={`text-xl leading-none ${isActive ? 'motion-safe:animate-wiggle' : ''}`} aria-hidden="true">
                      {emoji}
                    </span>
                    {label}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>
      )}
    </div>
  );
}
