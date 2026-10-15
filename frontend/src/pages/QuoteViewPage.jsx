import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import AppShell from '../components/layout/AppShell.jsx';
import Button from '../components/ui/Button.jsx';
import Spinner from '../components/ui/Spinner.jsx';
import { api, errorMessage } from '../lib/api.js';
import { brl } from '../lib/money.js';
import { formatDateBR } from '../lib/dates.js';
import { formatBRPhone } from '../lib/whatsapp.js';
import { QUOTE_STATUS, quoteNumber } from '../lib/quotes.js';
import { downloadQuotePdf } from '../lib/quotePdf.js';

const qty = (n) => n.toLocaleString('pt-BR', { maximumFractionDigits: 2 });

/** Visualizar Orçamento: o que o cliente vai receber, com o botão "Gerar PDF". */
export default function QuoteViewPage() {
  const { id } = useParams();
  const { session } = useAuth();
  const [quote, setQuote] = useState(null);
  const [error, setError] = useState(null);
  const [pdfState, setPdfState] = useState('idle'); // idle | working | done | failed

  useEffect(() => {
    let cancelled = false;
    api(`/quotes/${id}`)
      .then((q) => !cancelled && setQuote(q))
      .catch((err) => !cancelled && setError(errorMessage(err)));
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function generatePdf() {
    setPdfState('working');
    try {
      await downloadQuotePdf(quote, session.user);
      setPdfState('done');
    } catch (err) {
      console.error(err);
      setPdfState('failed');
    }
  }

  return (
    <AppShell title={quote ? `Orçamento ${quoteNumber(quote.id)}` : 'Orçamento'}>
      <main className="mx-auto max-w-2xl space-y-6 px-4 pt-6 pb-12 md:pt-10">
        <Link to="/" className="text-sm font-medium text-navy-700 hover:underline">
          ← Início
        </Link>

        {!quote && !error && (
          <div className="flex h-48 items-center justify-center gap-2 text-slate-500" aria-busy="true">
            <Spinner className="h-6 w-6" /> Carregando orçamento…
          </div>
        )}

        {error && !quote && (
          <div className="rounded-2xl bg-white px-6 py-10 text-center ring-1 ring-slate-200">
            <p className="font-medium text-slate-900">Não foi possível abrir este orçamento</p>
            <p className="mt-1 text-sm text-slate-500">{error}</p>
          </div>
        )}

        {quote && (
          <>
            <header className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-500">Orçamento {quoteNumber(quote.id)}</p>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight text-navy-900">{quote.client.name}</h1>
                <p className="mt-1 text-sm text-slate-500">
                  Criado em {new Date(quote.createdAt).toLocaleDateString('pt-BR')}
                  {quote.expiresAt && <> · válido até {formatDateBR(quote.expiresAt)}</>}
                </p>
              </div>
              <StatusChip status={quote.status} />
            </header>

            <div className="space-y-2">
              <Button block onClick={generatePdf} loading={pdfState === 'working'} className="shadow-pop">
                {pdfState !== 'working' && <PdfIcon />}
                {pdfState === 'working' ? 'Gerando PDF…' : 'Gerar PDF'}
              </Button>
              {pdfState === 'done' && <p role="status" className="text-center text-sm text-slate-500">PDF baixado. Confira a pasta de downloads.</p>}
              {pdfState === 'failed' && (
                <p role="alert" className="text-center text-sm font-medium text-red-600">
                  Não foi possível gerar o PDF. Tente de novo.
                </p>
              )}
            </div>

            {(quote.client.phone || quote.client.address) && (
              <section className="rounded-2xl bg-white p-4 text-sm shadow-card ring-1 ring-slate-200">
                <h2 className="mb-1 font-medium text-slate-500">Cliente</h2>
                {quote.client.phone && <p className="text-slate-900">{formatBRPhone(quote.client.phone)}</p>}
                {quote.client.address && <p className="text-slate-600">{quote.client.address}</p>}
              </section>
            )}

            <section aria-labelledby="items-title" className="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-slate-200">
              <h2 id="items-title" className="border-b border-slate-100 px-4 py-3 text-sm font-medium text-slate-500">
                Itens
              </h2>
              <ul className="divide-y divide-slate-100">
                {quote.items.map((item) => (
                  <li key={item.id} className="flex items-start justify-between gap-4 px-4 py-3">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900">{item.description}</p>
                      <p className="text-sm text-slate-500 tabular-nums">
                        {qty(item.quantity)} × {brl(item.unitPrice)}
                      </p>
                    </div>
                    <p className="shrink-0 font-semibold tabular-nums text-slate-900">{brl(item.total)}</p>
                  </li>
                ))}
              </ul>
              <div className="flex items-center justify-between bg-navy-900 px-4 py-4 text-white">
                <span className="font-medium text-navy-100">Total</span>
                <span className="text-2xl font-semibold tracking-tight tabular-nums" data-testid="quote-view-total">
                  {brl(quote.totalAmount)}
                </span>
              </div>
            </section>
          </>
        )}
      </main>
    </AppShell>
  );
}

function StatusChip({ status }) {
  const s = QUOTE_STATUS[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-medium ring-1 ring-inset ${s.chip}`}>
      <span className={`h-2 w-2 rounded-full ${s.dot}`} aria-hidden="true" />
      {s.label}
    </span>
  );
}

const PdfIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" strokeLinejoin="round" />
    <path d="M14 3v5h5M12 11v6m0 0-2.5-2.5M12 17l2.5-2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
