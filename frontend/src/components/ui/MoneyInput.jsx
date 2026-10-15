import { forwardRef, useRef } from 'react';
import Field from './Field.jsx';
import { brl } from '../../lib/money.js';

/**
 * Campo de dinheiro "estilo maquininha": o operador só digita números e o valor
 * vai entrando pela direita (4 -> 9 -> 9 = R$ 4,99). Valor controlado em centavos.
 *
 * Editar um valor já preenchido: o primeiro dígito após focar RECOMEÇA o valor
 * (sem isso, R$ 8,00 + digitar 180 virava R$ 8.001,80). Não depende de seleção de
 * texto, que o Safari iOS e teclados Android tratam de formas diferentes.
 */
const MoneyInput = forwardRef(function MoneyInput({ cents, onChangeCents, ...props }, ref) {
  const display = cents === null ? '' : brl(cents / 100);
  const fresh = useRef(false); // acabou de receber foco e ainda não foi digitado nada

  function handleChange(e) {
    const typed = e.nativeEvent?.data;
    if (fresh.current && typed && /^\d$/.test(typed)) {
      fresh.current = false;
      onChangeCents(Number(typed));
      return;
    }
    fresh.current = false;
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
      onFocus={(e) => {
        fresh.current = true;
        // Seleção síncrona só como dica visual; adiá-la (rAF) selecionaria o 1º dígito já digitado
        e.target.select();
      }}
      inputClassName="tabular-nums"
      {...props}
    />
  );
});

export default MoneyInput;
