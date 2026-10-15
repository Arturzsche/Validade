import { useMemo, useState } from 'react';
import Field from '../ui/Field.jsx';
import QuantityStepper from '../ui/QuantityStepper.jsx';
import Button from '../ui/Button.jsx';
import SemaphoreBadge from '../ui/SemaphoreBadge.jsx';
import { daysBetween, formatDateBR, parseNativeDate, semaphoreFor, todayIso, yearsFromToday } from '../../lib/dates.js';

/**
 * As duas únicas informações manuais do fluxo: validade e quantidade.
 * A validade usa o calendário nativo do celular (iOS/Android) — nada de digitar barras.
 * Embalagem com só mês/ano? Um toque troca para o seletor de mês (vale o último dia).
 * Mostra em tempo real em que cor do semáforo o produto vai cair.
 *
 * Modo metralhadora: a validade já vem focada (digite a data e aperte Enter para salvar);
 * Esc cancela e volta para o código de barras.
 */
export default function BatchEntryForm({ thresholds, saving, apiError, onSubmit, onCancel, autoFocusDate = false }) {
  const [expiryValue, setExpiryValue] = useState('');
  const [monthOnly, setMonthOnly] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [touched, setTouched] = useState(false);

  const parsed = useMemo(() => parseNativeDate(expiryValue), [expiryValue]);
  const days = parsed.iso ? daysBetween(todayIso(), parsed.iso) : null;
  const semaphore = days !== null ? semaphoreFor(days, thresholds) : null;
  const expired = days !== null && days < 0;
  const quantityError = !quantity ? 'Informe a quantidade' : null;

  function submit(e) {
    e.preventDefault();
    setTouched(true);
    if (parsed.error || quantityError) return;
    onSubmit({ expiryDate: parsed.iso, quantity });
  }

  const showDateError = parsed.error && (touched || expiryValue.length >= 10);

  function toggleMonthOnly() {
    setMonthOnly((v) => !v);
    setExpiryValue('');
  }

  // Abre o seletor nativo também ao clicar no texto do campo (Chrome desktop só abre no ícone)
  function openPicker(e) {
    try {
      e.currentTarget.showPicker?.();
    } catch {
      // navegador sem showPicker: o toque já abre o seletor
    }
  }

  return (
    <form
      onSubmit={submit}
      onKeyDown={(e) => e.key === 'Escape' && !saving && onCancel()}
      className="space-y-5"
      noValidate
    >
      <div>
        <Field
          key={monthOnly ? 'month' : 'date'}
          label={monthOnly ? 'Validade (mês e ano)' : 'Validade'}
          type={monthOnly ? 'month' : 'date'}
          max={monthOnly ? yearsFromToday(10).slice(0, 7) : yearsFromToday(10)}
          value={expiryValue}
          onChange={(e) => setExpiryValue(e.target.value)}
          onClick={openPicker}
          autoFocus={autoFocusDate}
          enterKeyHint="done"
          error={showDateError ? parsed.error : null}
          inputClassName="appearance-none text-xl font-bold tabular-nums [&::-webkit-date-and-time-value]:text-left"
        />
        <button
          type="button"
          onClick={toggleMonthOnly}
          className="mt-2 text-sm text-stone-500 underline underline-offset-2 hover:text-stone-800"
        >
          {monthOnly ? 'A embalagem tem o dia: escolher data completa' : 'A embalagem só tem mês e ano?'}
        </button>
        {parsed.iso && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <SemaphoreBadge semaphore={semaphore} days={days} />
            {parsed.monthOnly && <span className="text-sm text-stone-500">até {formatDateBR(parsed.iso)}</span>}
          </div>
        )}
      </div>

      <QuantityStepper value={quantity} onChange={setQuantity} error={touched ? quantityError : null} />

      {expired && (
        <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800 ring-1 ring-red-200">
          Esta data já passou. O produto será registrado como <strong>vencido</strong> e entra no relatório do dono.
        </p>
      )}

      {apiError && (
        <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-200">
          {apiError}
        </p>
      )}

      <div className="flex flex-col gap-3 pt-1">
        <Button type="submit" variant={expired ? 'danger' : 'primary'} loading={saving} block>
          {expired ? 'Registrar como vencido' : 'Salvar'}
          <span className="hidden text-sm font-normal opacity-70 sm:inline">(Enter)</span>
        </Button>
        <Button variant="ghost" onClick={onCancel} disabled={saving} block>
          Cancelar <span className="hidden text-stone-400 sm:inline">(Esc)</span>
        </Button>
      </div>
    </form>
  );
}
