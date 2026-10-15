import { useState } from 'react';
import Modal from '../ui/Modal.jsx';
import Field from '../ui/Field.jsx';
import { brl } from '../../lib/money.js';
import MoneyInput from '../ui/MoneyInput.jsx';
import Button from '../ui/Button.jsx';
import ProductThumb from '../ui/ProductThumb.jsx';
import CategoryPicker from '../ui/CategoryPicker.jsx';
import PhotoButton from '../ui/PhotoButton.jsx';
import { api, errorMessage } from '../../lib/api.js';

const toCents = (v) => (v == null ? null : Math.round(v * 100));

/**
 * Editar nome, categoria, foto, preço de venda e custo. O pai monta com key={product.id}.
 * Operador (`canEditPrices` false) corrige cadastro e foto; preço e custo são decisão do dono.
 */
export default function EditProductModal({ product, onClose, onSaved, onPhotoChanged, canEditPrices = true }) {
  const [name, setName] = useState(product.name);
  const [priceCents, setPriceCents] = useState(toCents(product.price));
  const [costCents, setCostCents] = useState(toCents(product.costPrice));
  const [category, setCategory] = useState(product.category ?? 'OTHER');
  const [photoVersion, setPhotoVersion] = useState(product.photoVersion ?? null);

  // A foto sobe na hora (não depende do "Salvar alterações")
  async function uploadPhoto(blob) {
    const updated = await api(`/products/${product.id}/photo`, { method: 'PUT', body: blob });
    setPhotoVersion(updated.photoVersion);
    onPhotoChanged?.(updated);
  }
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const nameError = name.trim().length < 2 ? 'Informe o nome do produto' : null;
  const priceError = !priceCents ? 'Informe o preço de venda' : null;
  const changed =
    name.trim() !== product.name ||
    priceCents !== toCents(product.price) ||
    costCents !== toCents(product.costPrice) ||
    category !== (product.category ?? 'OTHER');

  async function save(e) {
    e.preventDefault();
    if (nameError || priceError || !changed) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await api(`/products/${product.id}`, {
        method: 'PATCH',
        body: {
          name: name.trim(),
          category,
          ...(canEditPrices && { price: priceCents / 100, costPrice: costCents == null ? null : costCents / 100 }),
        },
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
        <div className="flex items-center gap-3 rounded-2xl bg-stone-50 p-3 ring-1 ring-stone-200">
          <ProductThumb product={{ ...product, name, category, photoVersion }} size="md" />
          <div className="min-w-0 flex-1 text-sm">
            <p className="text-stone-500">Código de barras</p>
            <p className="font-mono font-medium text-stone-900">{product.barcode}</p>
          </div>
          <PhotoButton onPhoto={uploadPhoto} hasPhoto={Boolean(photoVersion || product.imageUrl)} />
        </div>

        <Field label="Nome do produto" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} error={nameError} />
        <CategoryPicker value={category} onChange={setCategory} />
        {canEditPrices ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <MoneyInput label="Preço de venda" cents={priceCents} onChangeCents={setPriceCents} error={priceError} />
              <MoneyInput label="Preço de custo" cents={costCents} onChangeCents={setCostCents} hint="Opcional" />
            </div>
            <p className="text-sm text-stone-500">
              O novo preço vale para as próximas promoções. Produtos já registrados mantêm o valor da entrada.
            </p>
          </>
        ) : (
          <p className="flex items-center justify-between rounded-xl bg-stone-50 px-4 py-3 text-sm text-stone-600 ring-1 ring-stone-200">
            <span>Preço de venda · só o dono altera</span>
            <span className="font-semibold tabular-nums text-stone-900">{brl(product.price)}</span>
          </p>
        )}

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
