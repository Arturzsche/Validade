import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useDashboard } from '../hooks/useDashboard.js';
import AppShell from '../components/layout/AppShell.jsx';
import SummaryCards from '../components/dashboard/SummaryCards.jsx';
import ActionList from '../components/dashboard/ActionList.jsx';
import PromoModal from '../components/dashboard/PromoModal.jsx';
import Button from '../components/ui/Button.jsx';
import Spinner from '../components/ui/Spinner.jsx';

/** Tela 2 — Painel Semáforo do dono (celular e desktop). */
export default function DashboardPage() {
  const { session } = useAuth();
  const { data, error, loading, refreshing, refresh } = useDashboard();
  const [promoBatch, setPromoBatch] = useState(null);

  const refreshButton = (
    <button
      type="button"
      onClick={refresh}
      disabled={refreshing}
      aria-label="Atualizar painel"
      className="grid h-10 w-10 place-items-center rounded-xl text-slate-300 active:bg-white/10 md:hover:bg-white/10"
    >
      {refreshing ? (
        <Spinner className="h-5 w-5" />
      ) : (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M20 12a8 8 0 1 1-2.34-5.66M20 4v4h-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );

  return (
    <AppShell title="Painel" width="wide" actions={refreshButton}>
      <main className="mx-auto max-w-5xl space-y-8 px-4 py-5 md:py-8">
        {loading && <DashboardSkeleton />}

        {!loading && error && !data && (
          <div className="rounded-3xl bg-white px-6 py-10 text-center ring-1 ring-slate-200">
            <p className="font-semibold text-slate-900">Não foi possível carregar o painel</p>
            <p className="mt-1 text-sm text-slate-500">{error}</p>
            <Button className="mt-5" size="md" onClick={refresh}>
              Tentar de novo
            </Button>
          </div>
        )}

        {data && (
          <>
            {error && (
              <p role="alert" className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-200">
                Mostrando os últimos dados carregados. {error}
              </p>
            )}
            <SummaryCards zones={data.zones} thresholds={data.thresholds} />
            <ActionList items={data.actionItems} total={data.actionItemsTotal} onPromo={setPromoBatch} />
          </>
        )}
      </main>

      <PromoModal
        key={promoBatch?.id ?? 'closed'}
        batch={promoBatch}
        storeName={session.store.name}
        defaultDiscountPct={data?.promo.suggestedDiscountPct ?? session.store.suggestedDiscountPct}
        onClose={() => setPromoBatch(null)}
      />
    </AppShell>
  );
}

function DashboardSkeleton() {
  const block = 'animate-pulse rounded-3xl bg-slate-200';
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Carregando painel">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:grid-rows-2 md:gap-4">
        <div className={`col-span-2 h-48 md:row-span-2 md:h-auto ${block}`} />
        <div className={`h-32 md:col-span-2 ${block}`} />
        <div className={`h-32 md:col-span-2 ${block}`} />
      </div>
      <div className="space-y-3">
        <div className="h-6 w-40 animate-pulse rounded-lg bg-slate-200" />
        <div className={`h-64 ${block}`} />
      </div>
    </div>
  );
}
