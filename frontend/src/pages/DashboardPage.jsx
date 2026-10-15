import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useQuotesSummary } from '../hooks/useQuotesSummary.js';
import AppShell from '../components/layout/AppShell.jsx';
import Button from '../components/ui/Button.jsx';
import { brl } from '../lib/money.js';
import { relativeDay } from '../lib/dates.js';
import { formatRate, plural, QUOTE_STATUS } from '../lib/quotes.js';

const firstName = (name) => name?.trim().split(/\s+/)[0] ?? 'Prestador';

/** Tela principal: saudação, 3 números do negócio e os últimos orçamentos. */
export default function DashboardPage() {
  const { session } = useAuth();
  const { data, error, loading, reload } = useQuotesSummary();
  const navigate = useNavigate();
  const newQuote = () => navigate('/orcamentos/novo');

  return (
    <AppShell title="Início">
      <main className="mx-auto max-w-3xl space-y-8 px-4 pt-6 pb-[calc(7rem+env(safe-area-inset-bottom))] md:pt-10 md:pb-12">
        <header className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-navy-900 md:text-3xl">Olá, {firstName(session.user.name)}</h1>
            <p className="mt-1 text-slate-500">Aqui está o resumo dos seus orçamentos.</p>
          </div>
          {/* Desktop: botão no topo. Celular: botão flutuante no rodapé (ao alcance do polegar) */}
          <div className="hidden shrink-0 md:block">
            <Button size="md" onClick={newQuote}>
              <PlusIcon /> Novo Orçamento
            </Button>
          </div>
        </header>

        {loading && !data && <SummarySkeleton />}

        {!loading && error && !data && (
          <div className="rounded-2xl bg-white px-6 py-10 text-center ring-1 ring-slate-200">
            <p className="font-medium text-slate-900">Não foi possível carregar o resumo</p>
            <p className="mt-1 text-sm text-slate-500">{error}</p>
            <Button className="mt-5" size="md" variant="outline" onClick={reload}>
              Tentar de novo
            </Button>
          </div>
        )}

        {data && (
          <>
            <SummaryCards summary={data} />
            <RecentQuotes quotes={data.recent} />
          </>
        )}
      </main>

      <div className="fixed inset-x-0 bottom-0 z-20 bg-gradient-to-t from-canvas via-canvas/90 to-transparent px-4 pt-6 pb-[max(1rem,env(safe-area-inset-bottom))] md:hidden">
        <Button block onClick={newQuote} className="shadow-pop">
          <PlusIcon /> Novo Orçamento
        </Button>
      </div>
    </AppShell>
  );
}

function SummaryCards({ summary }) {
  const { approvedThisMonth: approved, pending, closeRate } = summary;
  return (
    <section aria-label="Resumo financeiro" className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
      {/* Destaque: o dinheiro que entrou no mês */}
      <div className="col-span-2 rounded-2xl bg-navy-900 p-5 text-white shadow-pop md:col-span-1">
        <p className="text-sm font-medium text-navy-200">Aprovados no Mês</p>
        <p className="mt-3 text-3xl font-semibold tracking-tight tabular-nums">{brl(approved.amount)}</p>
        <p className="mt-1 text-sm text-navy-200">{plural(approved.count, 'orçamento', 'orçamentos')}</p>
      </div>
      <StatCard label="Aguardando Resposta" value={brl(pending.amount)} caption={plural(pending.count, 'orçamento', 'orçamentos')} />
      <StatCard
        label="Taxa de Fechamento"
        value={formatRate(closeRate.rate)}
        caption={closeRate.answered ? `${closeRate.approved} de ${closeRate.answered} respondidos` : 'Sem respostas ainda'}
      />
    </section>
  );
}

function StatCard({ label, value, caption }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-slate-200">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-3 text-2xl font-semibold tracking-tight tabular-nums text-navy-900 md:text-3xl">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{caption}</p>
    </div>
  );
}

function RecentQuotes({ quotes }) {
  return (
    <section aria-labelledby="recent-title">
      <h2 id="recent-title" className="mb-3 text-lg font-semibold text-navy-900">
        Últimos Orçamentos
      </h2>
      {quotes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 px-6 py-12 text-center">
          <p className="font-medium text-slate-900">Nenhum orçamento ainda</p>
          <p className="mt-1 text-sm text-slate-500">Toque em “Novo Orçamento” para enviar o primeiro para um cliente.</p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-slate-200">
          {quotes.map((q) => (
            <QuoteRow key={q.id} quote={q} />
          ))}
        </ul>
      )}
    </section>
  );
}

function QuoteRow({ quote }) {
  const status = QUOTE_STATUS[quote.status];
  return (
    <li>
      <Link to={`/orcamentos/${quote.id}`} className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-slate-50 sm:px-5">
        <span
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-navy-50 text-sm font-semibold text-navy-700"
          aria-hidden="true"
        >
          {initials(quote.client.name)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-slate-900">{quote.client.name}</p>
          <p className="text-sm text-slate-500">{relativeDay(quote.createdAt)}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <p className="font-semibold tabular-nums text-slate-900">{brl(quote.totalAmount)}</p>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${status.chip}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} aria-hidden="true" />
            {status.label}
          </span>
        </div>
      </Link>
    </li>
  );
}

const initials = (name) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

function SummarySkeleton() {
  const block = 'animate-pulse rounded-2xl bg-slate-200/70';
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Carregando resumo">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
        <div className={`col-span-2 h-32 md:col-span-1 ${block}`} />
        <div className={`h-32 ${block}`} />
        <div className={`h-32 ${block}`} />
      </div>
      <div className={`h-72 ${block}`} />
    </div>
  );
}

const PlusIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
    <path d="M12 5v14M5 12h14" strokeLinecap="round" />
  </svg>
);
