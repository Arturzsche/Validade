import { useState } from 'react';
import Modal from '../ui/Modal.jsx';
import Field from '../ui/Field.jsx';
import MoneyInput from '../ui/MoneyInput.jsx';
import Button from '../ui/Button.jsx';
import ProductThumb from '../ui/ProductThumb.jsx';
import { api, errorMessage } from '../../lib/api.js';

const toCents = (v) => (v == null ? null : Math.round(v * 100));

/** Editar nome, preço de venda e custo. O pai monta com key={product.id}. */
export default function EditProductModal({ product, onClose, onSaved }) {
  const [name, setName] = useState(product.name);
  const [priceCents, setPriceCents] = useState(toCents(product.price));
  const [costCents, setCostCents] = useState(toCents(product.costPrice));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const nameError = name.trim().length < 2 ? 'Informe o nome do produto' : null;
  const priceError = !priceCents ? 'Informe o preço de venda' : null;
  const changed =
    name.trim() !== product.name || priceCents !== toCents(product.price) || costCents !== toCents(product.costPrice);

  async function save(e) {
    e.preventDefault();
    if (nameError || priceError || !changed) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await api(`/products/${product.id}`, {
        method: 'PATCH',
        body: { name: name.trim(), price: priceCents / 100, costPrice: costCents == null ? null : costCents / 100 },
      });
      onSaved(updated);
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="Editar produto">
      <form onSubmit={save} className="space-y-4" noValidate>
        <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
          <ProductThumb src={product.imageUrl} name={name || product.name} size="sm" />
          <div className="min-w-0 text-sm">
            <p className="text-slate-500">Código de barras</p>
            <p className="font-mono font-medium text-slate-900">{product.barcode}</p>
          </div>
        </div>

        <Field label="Nome do produto" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} error={nameError} />
        <div className="grid grid-cols-2 gap-3">
          <MoneyInput label="Preço de venda" cents={priceCents} onChangeCents={setPriceCents} error={priceError} />
          <MoneyInput label="Preço de custo" cents={costCents} onChangeCents={setCostCents} hint="Opcional" />
        </div>
        <p className="text-sm text-slate-500">
          O novo preço vale para as próximas promoções. Produtos já registrados mantêm o valor da entrada.
        </p>

        {error && (
          <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
            {error}
          </p>
        )}

        <Button type="submit" block loading={saving} disabled={!changed || Boolean(nameError || priceError)}>
          Salvar alterações
        </Button>
      </form>
    </Modal>
  );
}
