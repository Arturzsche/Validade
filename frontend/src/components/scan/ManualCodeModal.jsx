import { useState } from 'react';
import Modal from '../ui/Modal.jsx';
import Field from '../ui/Field.jsx';
import Button from '../ui/Button.jsx';

/** Plano B quando a câmera não lê (etiqueta amassada, pouca luz, sem permissão). */
export default function ManualCodeModal({ open, onClose, onSubmit }) {
  const [code, setCode] = useState('');
  const valid = /^\d{6,14}$/.test(code);

  function submit(e) {
    e.preventDefault();
    if (!valid) return;
    onSubmit(code);
    setCode('');
  }

  return (
    <Modal open={open} onClose={onClose} title="Digitar código" subtitle="Os números embaixo das barras.">
      <form onSubmit={submit} className="space-y-5">
        <Field
          label="Código de barras"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          autoFocus
          placeholder="7891234567890"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 14))}
          hint="De 6 a 14 dígitos"
          inputClassName="tracking-widest tabular-nums"
        />
        <Button type="submit" block disabled={!valid}>
          Continuar
        </Button>
      </form>
    </Modal>
  );
}
