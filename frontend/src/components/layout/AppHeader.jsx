import { useAuth } from '../../context/AuthContext.jsx';

export default function AppHeader({ title }) {
  const { session, logout } = useAuth();
  return (
    <header className="sticky top-0 z-30 bg-slate-900 text-white pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex h-16 max-w-md items-center justify-between gap-3 px-4">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium uppercase tracking-wider text-slate-400">{session.store.name}</p>
          <h1 className="truncate text-lg font-bold">{title}</h1>
        </div>
        <button
          type="button"
          onClick={logout}
          className="h-10 shrink-0 rounded-xl px-3 text-sm font-semibold text-slate-300 active:bg-white/10"
        >
          Sair
        </button>
      </div>
    </header>
  );
}
