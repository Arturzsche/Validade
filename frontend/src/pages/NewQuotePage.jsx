import { useEffect, useId, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AppShell from '../components/layout/AppShell.jsx';
import Button from '../components/ui/Button.jsx';
import Field from '../components/ui/Field.jsx';
import MoneyInput from '../components/ui/MoneyInput.jsx';
import Spinner from '../components/ui/Spinner.jsx';
import { api, errorMessage } from '../lib/api.js';
import { brl } from '../lib/money.js';
import { formatBRPhone, toE164BR } from '../lib/whatsapp.js';
import { isoDateIn, itemTotalCents, parseQuantity } from '../lib/quotes.js';

let nextKey = 1;

// O prestador costuma repetir a mesma chave PIX e as mesmas condições: lembramos neste aparelho
const PAYMENT_KEY = 'orcamentos.lastPayment';
function loadLastPayment() {
  try {
    return { paymentTerms: '', pixKey: '', ...JSON.parse(localStorage.getItem(PAYMENT_KEY)) };
  } catch {
    return { paymentTerms: '', pixKey: '' };
  }
}
function saveLastPayment(payment) {
  try {
    localStorage.setItem(PAYMENT_KEY, JSON.stringify(payment));
  } catch {
    // modo privado / storage bloqueado: só não lembra da próxima vez
  }
}
const emptyItem = () => ({ key: nextKey++, description: '', quantity: '1', unitPriceCents: null });

/**
 * Novo Orçamento: escolher (ou cadastrar na hora) o cliente, montar os itens e salvar.
 * O total é calculado aqui só para exibição; o valor oficial é recalculado pela API.
 */
export default function NewQuotePage() {
  const navigate = useNavigate();
  const [clients, setClients] = useState(null); // null = carregando
  const [clientId, setClientId] = useState('');
  const [creatingClient, setCreatingClient] = useState(false);
  const [items, setItems] = useState(() => [emptyItem()]);
  const [expiresAt, setExpiresAt] = useState(() => isoDateIn(15));
  const [payment, setPayment] = useState(loadLastPayment);
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const lastDescription = useRef(null);

  useEffect(() => {
    api('/clients?pageSize=100')
      .then((res) => {
        setClients(res.items);
        if (!res.items.length) setCreatingClient(true); // primeiro orçamento: já abre o cadastro
      })
      .catch((err) => {
        setClients([]);
        setError(errorMessage(err));
      });
  }, []);

  const parsed = items.map((item) => {
    const quantity = parseQuantity(item.quantity);
    return {
      ...item,
      quantityValue: quantity,
      totalCents: itemTotalCents(quantity, item.unitPriceCents),
      errors: {
        description: item.description.trim() ? null : 'Descreva o serviço ou material',
        quantity: quantity && quantity > 0 ? null : 'Quantidade inválida',
        unitPrice: item.unitPriceCents !== null ? null : 'Informe o valor',
      },
    };
  });
  const totalCents = parsed.reduce((sum, i) => sum + i.totalCents, 0);
  const itemsValid = parsed.every((i) => !Object.values(i.errors).some(Boolean));
  const clientError = clientId ? null : 'Escolha um cliente';

  const updateItem = (key, patch) => setItems((list) => list.map((i) => (i.key === key ? { ...i, ...patch } : i)));
  const removeItem = (key) => setItems((list) => list.filter((i) => i.key !== key));
  const addItem = () => {
    setItems((list) => [...list, emptyItem()]);
    requestAnimationFrame(() => lastDescription.current?.focus());
  };

  function onClientCreated(client) {
    setClients((list) => [...(list ?? []), client].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')));
    setClientId(client.id);
    setCreatingClient(false);
  }

  async function save(e) {
    e.preventDefault();
    setTouched(true);
    if (clientError || !itemsValid) return;
    setSaving(true);
    setError(null);
    try {
      const quote = await api('/quotes', {
        method: 'POST',
        body: {
          clientId,
          expiresAt: expiresAt || null,
          paymentTerms: payment.paymentTerms.trim() || null,
          pixKey: payment.pixKey.trim() || null,
          items: parsed.map((i) => ({
            description: i.description.trim(),
            quantity: i.quantityValue,
            unitPrice: i.unitPriceCents / 100,
          })),
        },
      });
      saveLastPayment({ paymentTerms: payment.paymentTerms.trim(), pixKey: payment.pixKey.trim() });
      navigate(`/orcamentos/${quote.id}`, { replace: true });
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  }

  return (
    <AppShell title="Novo Orçamento">
      <form onSubmit={save} noValidate className="mx-auto max-w-2xl space-y-8 px-4 pt-6 pb-[calc(9rem+env(safe-area-inset-bottom))] md:pt-10">
        <header>
          <Link to="/" className="text-sm font-medium text-navy-700 hover:underline">
            ← Início
          </Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-navy-900">Novo Orçamento</h1>
        </header>

        {/* ---------- Cliente */}
        <section aria-labelledby="client-title" className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 id="client-title" className="text-lg font-semibold text-navy-900">
              Cliente
            </h2>
            {!creatingClient && (
              <button
                type="button"
                onClick={() => setCreatingClient(true)}
                className="h-9 rounded-lg px-3 text-sm font-medium text-navy-700 hover:bg-navy-50"
              >
                + Novo cliente
              </button>
            )}
          </div>

          {clients === null ? (
            <div className="flex h-14 items-center gap-2 text-slate-500">
              <Spinner className="h-5 w-5" /> Carregando clientes…
            </div>
          ) : (
            clients.length > 0 && (
              <ClientSelect
                clients={clients}
                value={clientId}
                onChange={setClientId}
                error={touched && !creatingClient ? clientError : null}
              />
            )
          )}

          {creatingClient && (
            <NewClientPanel
              onCreated={onClientCreated}
              onCancel={clients?.length ? () => setCreatingClient(false) : null}
              showError={touched}
            />
          )}
        </section>

        {/* ---------- Itens */}
        <section aria-labelledby="items-title" className="space-y-3">
          <h2 id="items-title" className="text-lg font-semibold text-navy-900">
            Itens
          </h2>
          <ol className="space-y-3">
            {parsed.map((item, index) => (
              <li key={item.key} className="rounded-2xl bg-white p-4 shadow-card ring-1 ring-slate-200" aria-label={`Item ${index + 1}`}>
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-500">Item {index + 1}</span>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(item.key)}
                      aria-label={`Remover item ${index + 1}`}
                      className="-mr-2 grid h-9 w-9 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    >
                      <TrashIcon />
                    </button>
                  )}
                </div>
                <div className="space-y-3">
                  <Field
                    ref={index === items.length - 1 ? lastDescription : undefined}
                    label="Descrição"
                    placeholder="Ex: Instalação de chuveiro"
                    value={item.description}
                    onChange={(e) => updateItem(item.key, { description: e.target.value })}
                    maxLength={300}
                    error={touched ? item.errors.description : null}
                  />
                  <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-3">
                    <Field
                      label="Quantidade"
                      inputMode="decimal"
                      value={item.quantity}
                      onChange={(e) => updateItem(item.key, { quantity: e.target.value })}
                      onFocus={(e) => e.target.select()}
                      error={touched ? item.errors.quantity : null}
                      inputClassName="tabular-nums"
                    />
                    <MoneyInput
                      label="Valor unitário"
                      cents={item.unitPriceCents}
                      onChangeCents={(unitPriceCents) => updateItem(item.key, { unitPriceCents })}
                      error={touched ? item.errors.unitPrice : null}
                    />
                  </div>
                  <p className="flex justify-between border-t border-slate-100 pt-3 text-sm text-slate-500">
                    Subtotal <span className="font-semibold tabular-nums text-slate-900">{brl(item.totalCents / 100)}</span>
                  </p>
                </div>
              </li>
            ))}
          </ol>
          <Button variant="outline" size="md" block onClick={addItem}>
            + Adicionar Item
          </Button>
        </section>

        {/* ---------- Pagamento: aparece no PDF e passa confiança ao cliente */}
        <section aria-labelledby="payment-title" className="space-y-3">
          <h2 id="payment-title" className="text-lg font-semibold text-navy-900">
            Pagamento
          </h2>
          <Field
            label="Condições de Pagamento"
            placeholder="Ex: 50% no início e 50% na entrega"
            value={payment.paymentTerms}
            onChange={(e) => setPayment((p) => ({ ...p, paymentTerms: e.target.value }))}
            maxLength={500}
            autoComplete="off"
          />
          <Field
            label="Chave PIX"
            placeholder="CPF, CNPJ, e-mail, telefone ou chave aleatória"
            value={payment.pixKey}
            onChange={(e) => setPayment((p) => ({ ...p, pixKey: e.target.value }))}
            maxLength={140}
            autoComplete="off"
            hint="Facilite o pagamento da entrada"
          />
        </section>

        {/* ---------- Validade */}
        <section>
          <Field
            label="Válido até"
            type="date"
            value={expiresAt}
            min={isoDateIn(0)}
            onChange={(e) => setExpiresAt(e.target.value)}
            hint="Prazo para o cliente aprovar o orçamento"
            className="max-w-xs"
          />
        </section>

        {error && (
          <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-200">
            {error}
          </p>
        )}

        {/* ---------- Resumo + salvar: sempre visível no rodapé */}
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)]">
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-4 px-4 py-3">
            <div>
              <p className="text-xs font-medium text-slate-500">Total do orçamento</p>
              <p className="text-2xl font-semibold tracking-tight tabular-nums text-navy-900" aria-live="polite" data-testid="quote-total">
                {brl(totalCents / 100)}
              </p>
            </div>
            <Button type="submit" size="md" loading={saving} className="shrink-0">
              Salvar orçamento
            </Button>
          </div>
        </div>
      </form>
    </AppShell>
  );
}

function ClientSelect({ clients, value, onChange, error }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-700">
        Escolha o cliente
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={Boolean(error)}
          className="h-14 w-full appearance-none rounded-xl border-0 bg-white px-4 pr-11 text-lg font-medium text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-navy-500 focus:outline-none aria-[invalid=true]:ring-red-500"
        >
          <option value="" disabled>
            Selecione…
          </option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c.phone ? ` · ${formatBRPhone(c.phone)}` : ''}
            </option>
          ))}
        </select>
        <svg viewBox="0 0 20 20" className="pointer-events-none absolute top-1/2 right-4 h-5 w-5 -translate-y-1/2 text-slate-500" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
          <path d="M5.5 7.5 10 12l4.5-4.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      {error && <p className="mt-1.5 text-sm font-medium text-red-600">{error}</p>}
    </div>
  );
}

/** Cadastro rápido de cliente sem sair do orçamento (Nome + WhatsApp). */
function NewClientPanel({ onCreated, onCancel, showError }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [tried, setTried] = useState(false);

  const nameError = name.trim().length < 2 ? 'Informe o nome do cliente' : null;
  const phoneE164 = phone.trim() ? toE164BR(phone) : null;
  const phoneError = phone.trim() && !phoneE164 ? 'WhatsApp inválido: informe DDD + número' : null;

  async function create() {
    setTried(true);
    if (nameError || phoneError) return;
    setSaving(true);
    setError(null);
    try {
      onCreated(await api('/clients', { method: 'POST', body: { name: name.trim(), ...(phoneE164 && { phone: phoneE164 }) } }));
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  }

  // Enter aqui cadastra o cliente (e não envia o orçamento inteiro)
  const onKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      create();
    }
  };

  const show = tried || showError;
  return (
    <div className="space-y-3 rounded-2xl bg-navy-50/60 p-4 ring-1 ring-navy-100" onKeyDown={onKeyDown}>
      <p className="text-sm font-medium text-navy-900">Cadastrar novo cliente</p>
      <Field label="Nome" value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" maxLength={120} error={show ? nameError : null} />
      <Field
        label="Telefone / WhatsApp"
        type="tel"
        inputMode="tel"
        placeholder="(11) 99999-8888"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        autoComplete="off"
        hint="Opcional"
        error={show ? phoneError : null}
      />
      {error && <p className="text-sm font-medium text-red-600">{error}</p>}
      <div className="flex gap-2">
        <Button size="md" className="flex-1" onClick={create} loading={saving}>
          Salvar cliente
        </Button>
        {onCancel && (
          <Button size="md" variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
        )}
      </div>
    </div>
  );
}

const TrashIcon = () => (
  <svg viewBox="0 0 20 20" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
    <path d="M3.5 5.5h13M8 5.5V4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1.5M5.5 5.5l.7 10a1.5 1.5 0 0 0 1.5 1.4h4.6a1.5 1.5 0 0 0 1.5-1.4l.7-10" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
