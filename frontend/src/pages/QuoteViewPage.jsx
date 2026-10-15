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
import { buildShareMessage, QUOTE_STATUS, quoteNumber, whatsappShareUrl } from '../lib/quotes.js';
import { downloadQuotePdf } from '../lib/quotePdf.js';

const qty = (n) => n.toLocaleString('pt-BR', { maximumFractionDigits: 2 });

/** Visualizar Orçamento: o que o cliente vai receber, com o botão "Gerar PDF". */
export default function QuoteViewPage() {
  const { id } = useParams();
  const { session } = useAuth();
  const [quote, setQuote] = useState(null);
  const [error, setError] = useState(null);
  const [pdfState, setPdfState] = useState('idle'); // idle | working | done | failed
  const [statusSaving, setStatusSaving] = useState(null); // status sendo gravado
  const [statusError, setStatusError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api(`/quotes/${id}`)
      .then((q) => !cancelled && setQuote(q))
      .catch((err) => !cancelled && setError(errorMessage(err)));
    return () => {
      cancelled = true;
    };
  }, [id]);

  /** Prestador marca a resposta do cliente. O Dashboard busca o resumo ao abrir, então já vem atualizado. */
  async function changeStatus(status) {
    setStatusSaving(status);
    setStatusError(null);
    try {
      setQuote(await api(`/quotes/${quote.id}/status`, { method: 'PATCH', body: { status } }));
    } catch (err) {
      setStatusError(errorMessage(err));
    } finally {
      setStatusSaving(null);
    }
  }

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
              <a
                href={whatsappShareUrl(quote.client.phone, buildShareMessage(quote, session.user, brl))}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-6 font-semibold text-[#0b3d20] shadow-pop transition-colors hover:bg-[#1fbe5b] focus-visible:ring-4 focus-visible:ring-[#25D366]/40 focus-visible:outline-none"
              >
                <WhatsAppIcon /> Enviar no WhatsApp
              </a>
              <Button block variant="outline" onClick={generatePdf} loading={pdfState === 'working'}>
                {pdfState !== 'working' && <PdfIcon />}
                {pdfState === 'working' ? 'Gerando PDF…' : 'Gerar PDF'}
              </Button>
              <p className="text-center text-xs text-slate-500">
                {quote.client.phone
                  ? 'A conversa abre no WhatsApp do cliente. Depois, anexe o PDF gerado.'
                  : 'Cliente sem WhatsApp cadastrado: você escolhe o contato. Depois, anexe o PDF gerado.'}
              </p>
              {pdfState === 'done' && <p role="status" className="text-center text-sm text-slate-500">PDF baixado. Confira a pasta de downloads.</p>}
              {pdfState === 'failed' && (
                <p role="alert" className="text-center text-sm font-medium text-red-600">
                  Não foi possível gerar o PDF. Tente de novo.
                </p>
              )}
            </div>

            <StatusControl current={quote.status} saving={statusSaving} error={statusError} onChange={changeStatus} />

            {(quote.paymentTerms || quote.pixKey) && (
              <section aria-labelledby="payment-title" className="space-y-3 rounded-2xl bg-slate-100 p-4 text-sm">
                <h2 id="payment-title" className="font-medium text-slate-500">
                  Pagamento
                </h2>
                {quote.paymentTerms && (
                  <div>
                    <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">Condições</p>
                    <p className="text-slate-900">{quote.paymentTerms}</p>
                  </div>
                )}
                {quote.pixKey && (
                  <div>
                    <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">Chave PIX</p>
                    <p className="font-medium break-all text-slate-900">{quote.pixKey}</p>
                  </div>
                )}
              </section>
            )}

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

const STATUS_ACTIONS = [
  { status: 'APPROVED', label: 'Marcar como Aprovado', idle: 'text-emerald-700 ring-emerald-300 hover:bg-emerald-50', active: 'bg-emerald-600 text-white ring-emerald-600' },
  { status: 'REJECTED', label: 'Marcar como Rejeitado', idle: 'text-red-700 ring-red-300 hover:bg-red-50', active: 'bg-red-600 text-white ring-red-600' },
  { status: 'PENDING', label: 'Voltar para Pendente', idle: 'text-slate-600 ring-slate-300 hover:bg-slate-50', active: 'bg-slate-600 text-white ring-slate-600' },
];

/** O prestador registra a resposta do cliente (o app não adivinha: quem conversa é ele). */
function StatusControl({ current, saving, error, onChange }) {
  return (
    <section aria-labelledby="status-title" className="space-y-2">
      <h2 id="status-title" className="text-sm font-medium text-slate-500">
        Resposta do cliente
      </h2>
      <div className="flex flex-wrap gap-2">
        {STATUS_ACTIONS.map((a) => {
          const isCurrent = current === a.status;
          return (
            <button
              key={a.status}
              type="button"
              onClick={() => onChange(a.status)}
              disabled={isCurrent || Boolean(saving)}
              aria-pressed={isCurrent}
              className={`inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-sm font-medium ring-1 ring-inset transition-colors disabled:cursor-default ${
                isCurrent ? a.active : `bg-white ${a.idle} disabled:opacity-50`
              }`}
            >
              {saving === a.status ? <Spinner className="h-4 w-4" /> : isCurrent && <CheckIcon />}
              {isCurrent ? QUOTE_STATUS[a.status].label : a.label}
            </button>
          );
        })}
      </div>
      {error && (
        <p role="alert" className="text-sm font-medium text-red-600">
          {error}
        </p>
      )}
    </section>
  );
}

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
    <path d="m5 12 5 5 9-10" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden="true">
    <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.3-.2-.5-.3z" />
  </svg>
);

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
