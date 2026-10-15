import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useWhatsAppStatus } from '../../hooks/useWhatsAppStatus.js';
import WhatsAppStatusBadge from '../whatsapp/WhatsAppStatusBadge.jsx';
import WhatsAppModal from '../whatsapp/WhatsAppModal.jsx';
import Logo from '../brand/Logo.jsx';
import { APP_NAME } from '../../lib/brand.js';

/** Moldura das telas logadas: cabeçalho branco fixo com a marca e "Sair". */
export default function AppShell({ title, children }) {
  const { logout } = useAuth();
  const whatsapp = useWhatsAppStatus({ enabled: true });
  const [whatsAppOpen, setWhatsAppOpen] = useState(false);
  // O WhatsApp é a sessão da plataforma: só quem administra (WHATSAPP_ADMIN_EMAILS) vê o indicador
  const canManageWhatsApp = Boolean(whatsapp.status?.canManage);

  useEffect(() => {
    document.title = title ? `${title} · ${APP_NAME}` : APP_NAME;
  }, [title]);

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 bg-white pt-[env(safe-area-inset-top)] shadow-header">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-3 px-4">
          <Logo markClassName="h-8 w-8 shrink-0" />
          <div className="flex shrink-0 items-center gap-1">
            {canManageWhatsApp && <WhatsAppStatusBadge level={whatsapp.level} onClick={() => setWhatsAppOpen(true)} />}
            <button
              type="button"
              onClick={logout}
              className="h-9 rounded-lg px-3 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      {children}

      {canManageWhatsApp && (
        <WhatsAppModal
          open={whatsAppOpen}
          onClose={() => setWhatsAppOpen(false)}
          status={whatsapp.status}
          onStatus={whatsapp.setStatus}
        />
      )}
    </div>
  );
}
