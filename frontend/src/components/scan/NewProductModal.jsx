import { useEffect, useState } from 'react';
import Modal from '../ui/Modal.jsx';
import Field from '../ui/Field.jsx';
import MoneyInput from '../ui/MoneyInput.jsx';
import Button from '../ui/Button.jsx';
import CategoryPicker from '../ui/CategoryPicker.jsx';
import PhotoButton from '../ui/PhotoButton.jsx';
import ProductThumb from '../ui/ProductThumb.jsx';
import { brl, centsToReais } from '../../lib/money.js';
import { guessCategory } from '../../lib/categories.js';

/**
 * Mini-cadastro aberto quando o código lido não existe na loja (404 na busca ou
 * 422 PRODUCT_NOT_FOUND ao salvar). Não grava nada sozinho: devolve um rascunho
 * que vai junto no POST /batches, criando produto + lote numa única transação.
 */
export default function NewProductModal({ open, barcode, initial, suggestion, onClose, onSubmit, onPhoto, photoPreview }) {
  const [name, setName] = useState('');
  const [costCents, setCostCents] = useState(null);
  const [priceCents, setPriceCents] = useState(null);
  const [touched, setTouched] = useState(false);
  const [category, setCategory] = useState('OTHER');
  const [categoryChosen, setCategoryChosen] = useState(false); // depois do toque, o palpite pelo nome para

  // Preenche ao abrir: rascunho anterior (editar) > sugestão do Open Food Facts
  useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? suggestion?.name ?? '');
    setCostCents(initial?.costPrice != null ? Math.round(initial.costPrice * 100) : null);
    setPriceCents(initial?.price != null ? Math.round(initial.price * 100) : null);
    setCategory(initial?.category ?? guessCategory(initial?.name ?? suggestion?.name ?? ''));
    setCategoryChosen(Boolean(initial?.category));
    setTouched(false);
  }, [open, initial, suggestion]);

  function changeName(value) {
    setName(value);
    if (!categoryChosen) setCategory(guessCategory(value)); // "Ração..." já marca Pets
  }

  const errors = {
    name: name.trim().length < 2 ? 'Informe o nome do produto' : null,
    price: !priceCents ? 'Informe o preço de venda' : null,
  };
  const valid = !errors.name && !errors.price;
  const costAbovePrice = costCents != null && priceCents != null && costCents > priceCents;

  function submit(e) {
    e.preventDefault();
    setTouched(true);
    if (!valid) return;
    onSubmit({
      name: name.trim(),
      brand: initial?.brand ?? suggestion?.brand ?? undefined,
      imageUrl: initial?.imageUrl ?? suggestion?.imageUrl ?? undefined,
      category,
      price: centsToReais(priceCents),
      costPrice: costCents != null ? centsToReais(costCents) : undefined,
    });
  }

  return (
    <Modal open={open} onClose={onClose} title="Produto novo" subtitle={`Código ${barcode} ainda não está cadastrado na loja.`}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        {suggestion?.imageUrl && !initial && (
          <div className="flex items-center gap-3 rounded-2xl bg-stone-50 p-3 ring-1 ring-stone-200">
            <img src={suggestion.imageUrl} alt="" className="h-12 w-12 rounded-xl bg-white object-contain" />
            <p className="text-sm text-stone-600">Encontramos nome e foto na base pública. Confira antes de salvar.</p>
          </div>
        )}

        <Field
          label="Nome do produto"
          autoFocus={!name}
          autoComplete="off"
          autoCapitalize="sentences"
          placeholder="Ex: Iogurte Natural 170g"
          value={name}
          onChange={(e) => changeName(e.target.value)}
          error={touched && errors.name}
        />

        <CategoryPicker
          value={category}
          onChange={(value) => {
            setCategory(value);
            setCategoryChosen(true);
          }}
        />

        {onPhoto && (
          <div className="flex items-center gap-3 rounded-xl bg-stone-50 p-3 ring-1 ring-stone-200">
            <ProductThumb
              product={{ name, category, imageUrl: initial?.imageUrl ?? suggestion?.imageUrl }}
              previewSrc={photoPreview}
              size="md"
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-stone-900">{photoPreview ? 'Foto pronta' : 'Sem foto? Sem problema.'}</p>
              <p className="text-xs text-stone-500">
                {photoPreview ? 'Ela aparece no painel e no catálogo.' : 'Usamos o emoji da categoria, ou tire uma foto da embalagem.'}
              </p>
            </div>
            <PhotoButton onPhoto={onPhoto} hasPhoto={Boolean(photoPreview)} />
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <MoneyInput label="Preço de custo" cents={costCents} onChangeCents={setCostCents} hint="Opcional" />
          <MoneyInput
            label="Preço de venda"
            cents={priceCents}
            onChangeCents={setPriceCents}
            error={touched && errors.price}
          />
        </div>

        {costAbovePrice ? (
          <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800 ring-1 ring-amber-200">
            O custo está maior que o preço de venda. Confira os valores.
          </p>
        ) : (
          costCents == null && (
            <p className="text-sm text-stone-500">
              Sem o custo, o valor em risco é calculado pelo preço de venda.
            </p>
          )
        )}

        {costCents != null && priceCents != null && !costAbovePrice && (
          <p className="text-sm text-stone-500">
            Margem: <span className="font-semibold text-stone-700">{brl((priceCents - costCents) / 100)}</span> por unidade
          </p>
        )}

        <Button type="submit" block>
          Continuar
        </Button>
      </form>
    </Modal>
  );
}
