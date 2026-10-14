import { forwardRef } from 'react';
import Field from './Field.jsx';
import { brl } from '../../lib/money.js';

/**
 * Campo de dinheiro "estilo maquininha": o operador só digita números e o valor
 * vai entrando pela direita (4 -> 9 -> 9 = R$ 4,99). Valor controlado em centavos.
 */
const MoneyInput = forwardRef(function MoneyInput({ cents, onChangeCents, ...props }, ref) {
  const display = cents === null ? '' : brl(cents / 100);

  function handleChange(e) {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 9);
    onChangeCents(digits ? Number(digits) : null);
  }

  return (
    <Field
      ref={ref}
      inputMode="numeric"
      autoComplete="off"
      placeholder="R$ 0,00"
      value={display}
      onChange={handleChange}
      inputClassName="tabular-nums"
      {...props}
    />
  );
});

export default MoneyInput;
