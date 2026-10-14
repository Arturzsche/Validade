import { useMemo, useState } from 'react';
import Field from '../ui/Field.jsx';
import QuantityStepper from '../ui/QuantityStepper.jsx';
import Button from '../ui/Button.jsx';
import SemaphoreBadge from '../ui/SemaphoreBadge.jsx';
import { daysBetween, formatDateBR, maskDate, parseExpiry, semaphoreFor, todayIso } from '../../lib/dates.js';

/**
 * As duas únicas informações manuais do fluxo: validade e quantidade.
 * Mostra em tempo real em que cor do semáforo o lote vai cair.
 */
export default function BatchEntryForm({ thresholds, saving, apiError, onSubmit, onCancel }) {
  const [expiryText, setExpiryText] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [touched, setTouched] = useState(false);

  const parsed = useMemo(() => (expiryText ? parseExpiry(expiryText) : { error: 'Informe a validade' }), [expiryText]);
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

  const showDateError = parsed.error && (touched || expiryText.replace(/\D/g, '').length >= 6);

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <div>
        <Field
          label="Validade"
          inputMode="numeric"
          autoComplete="off"
          autoFocus
          enterKeyHint="next"
          placeholder="DD/MM/AAAA"
          value={expiryText}
          onChange={(e) => setExpiryText(maskDate(e.target.value))}
          error={showDateError ? parsed.error : null}
          hint="Só tem mês/ano na embalagem? Digite MM/AAAA"
          inputClassName="text-2xl font-bold tracking-wider tabular-nums"
        />
        {parsed.iso && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <SemaphoreBadge semaphore={semaphore} days={days} />
            {parsed.monthOnly && <span className="text-sm text-slate-500">até {formatDateBR(parsed.iso)}</span>}
          </div>
        )}
      </div>

      <QuantityStepper value={quantity} onChange={setQuantity} error={touched ? quantityError : null} />

      {expired && (
        <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800 ring-1 ring-red-200">
          Esta data já passou. O lote será registrado como <strong>vencido</strong> e o dono será avisado.
        </p>
      )}

      {apiError && (
        <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-200">
          {apiError}
        </p>
      )}

      <div className="flex flex-col gap-3 pt-1">
        <Button type="submit" variant={expired ? 'danger' : 'primary'} loading={saving} block>
          {expired ? 'Registrar lote vencido' : 'Salvar lote'}
        </Button>
        <Button variant="ghost" onClick={onCancel} disabled={saving} block>
          Cancelar e ler outro
        </Button>
      </div>
    </form>
  );
}
