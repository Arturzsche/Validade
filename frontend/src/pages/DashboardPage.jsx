import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useDashboard } from '../hooks/useDashboard.js';
import AppShell from '../components/layout/AppShell.jsx';
import SummaryCards from '../components/dashboard/SummaryCards.jsx';
import ActionList from '../components/dashboard/ActionList.jsx';
import PromoModal from '../components/dashboard/PromoModal.jsx';
import TodaySummary from '../components/dashboard/TodaySummary.jsx';
import StockHealth from '../components/dashboard/StockHealth.jsx';
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
      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6 md:space-y-8 md:py-10">
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
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_22rem] md:items-end md:gap-8">
              <TodaySummary storeName={session.store.name} items={data.actionItems} />
              <StockHealth zones={data.zones} />
            </div>
            <SummaryCards zones={data.zones} thresholds={data.thresholds} />
            <ActionList
              items={data.actionItems}
              total={data.actionItemsTotal}
              thresholds={data.thresholds}
              onPromo={setPromoBatch}
            />
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
  const block = 'animate-pulse rounded-2xl bg-slate-200/80';
  return (
    <div className="space-y-6 md:space-y-8" aria-busy="true" aria-label="Carregando painel">
      <div className="space-y-2">
        <div className="h-7 w-48 animate-pulse rounded-lg bg-slate-200/80" />
        <div className="h-5 w-72 max-w-full animate-pulse rounded-lg bg-slate-200/80" />
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
        <div className={`col-span-2 h-36 md:col-span-1 ${block}`} />
        <div className={`h-36 ${block}`} />
        <div className={`h-36 ${block}`} />
      </div>
      <div className={`h-64 ${block}`} />
    </div>
  );
}
