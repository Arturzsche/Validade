import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Modal from '../ui/Modal.jsx';
import Button from '../ui/Button.jsx';
import ProductThumb from '../ui/ProductThumb.jsx';
import { describeDays } from '../ui/SemaphoreBadge.jsx';
import PriceLabel from './PriceLabel.jsx';
import { brl } from '../../lib/money.js';
import { copyText } from '../../lib/clipboard.js';
import { buildPromoText, DISCOUNT_OPTIONS, promoNumbers } from '../../lib/promo.js';

/**
 * Criar promoção: texto pronto para o WhatsApp (copiar com um toque) e etiqueta de gôndola
 * para imprimir. O desconto começa no padrão da loja e pode ser trocado.
 */
export default function PromoModal({ batch, storeName, defaultDiscountPct, onClose }) {
  // O pai monta com key={batch.id}: cada produto começa limpo, com o desconto padrão da loja
  const [discountPct, setDiscountPct] = useState(defaultDiscountPct);
  const [editedText, setEditedText] = useState(null); // null = usa o texto gerado
  const [copyState, setCopyState] = useState('idle'); // idle | copied | failed
  const textareaRef = useRef(null);

  const options = [...new Set([...DISCOUNT_OPTIONS, defaultDiscountPct])].sort((a, b) => a - b);

  if (!batch) return null;
  const n = promoNumbers(batch, discountPct);
  const text = editedText ?? buildPromoText({ batch, storeName, discountPct });
  const label = { batch, promoPrice: n.promoPrice, price: n.price, discountPct, storeName };

  function chooseDiscount(pct) {
    setDiscountPct(pct);
    setEditedText(null); // novo desconto = texto regenerado
    setCopyState('idle');
  }

  async function handleCopy() {
    const ok = await copyText(text);
    setCopyState(ok ? 'copied' : 'failed');
    if (!ok) textareaRef.current?.select();
  }

  return (
    <Modal open={Boolean(batch)} onClose={onClose} title="Criar promoção">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <ProductThumb product={batch.product} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-stone-900">{batch.product.name}</p>
            <p className="text-sm text-stone-500">
              <span className="font-medium text-red-600">{describeDays(batch.daysToExpiry)}</span> · {batch.quantity} un.
            </p>
          </div>
        </div>

        <fieldset>
          <legend className="sr-only">Desconto</legend>
          <div className="grid grid-flow-col gap-1 rounded-xl bg-stone-100 p-1">
            {options.map((pct) => (
              <button
                key={pct}
                type="button"
                aria-pressed={discountPct === pct}
                onClick={() => chooseDiscount(pct)}
                className={`h-9 rounded-lg text-sm font-medium transition-colors ${
                  discountPct === pct ? 'bg-white text-stone-900 shadow-card ring-1 ring-stone-200' : 'text-stone-500 hover:text-stone-900'
                }`}
              >
                -{pct}%
              </button>
            ))}
          </div>
          <p className="mt-2 text-sm text-stone-600">
            Por <strong className="font-semibold text-stone-900 tabular-nums">{brl(n.promoPrice)}</strong>{' '}
            <span className="text-stone-400 line-through">{brl(n.price)}</span> · vendendo tudo, entram{' '}
            <strong className="font-semibold text-emerald-700 tabular-nums">{brl(n.recovered)}</strong>
          </p>
          {n.belowCost && (
            <p className="mt-1 text-sm text-amber-700">
              Abaixo do custo, mas recupera parte dos {brl(n.loss)} que iriam para o lixo.
            </p>
          )}
        </fieldset>

        <section aria-labelledby="promo-text-title" className="space-y-2">
          <label id="promo-text-title" htmlFor="promo-text" className="block text-sm font-medium text-stone-700">
            Mensagem para o WhatsApp
          </label>
          <textarea
            id="promo-text"
            ref={textareaRef}
            value={text}
            onChange={(e) => {
              setEditedText(e.target.value);
              setCopyState('idle');
            }}
            rows={6}
            className="w-full resize-none rounded-xl border-0 bg-stone-50 p-3.5 font-sans text-[15px] leading-relaxed text-stone-900 ring-1 ring-inset ring-stone-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
          <div className="flex gap-2">
            <Button size="md" className="flex-1" onClick={handleCopy}>
              {copyState === 'copied' ? <><CheckIcon /> Copiado!</> : <><CopyIcon /> Copiar texto</>}
            </Button>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(text)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-12 items-center justify-center rounded-xl px-4 text-sm font-medium text-stone-600 ring-1 ring-inset ring-stone-300 hover:bg-stone-50"
            >
              Abrir no WhatsApp
            </a>
          </div>
          {copyState === 'failed' && (
            <p role="alert" className="text-sm font-medium text-red-600">
              Não foi possível copiar automaticamente. O texto foi selecionado: copie manualmente.
            </p>
          )}
        </section>

        <section aria-labelledby="label-title" className="space-y-2 border-t border-stone-100 pt-5">
          <h3 id="label-title" className="text-sm font-medium text-stone-700">
            Etiqueta de gôndola
          </h3>
          <div className="mx-auto max-w-[18rem]">
            <PriceLabel {...label} />
          </div>
          <Button variant="outline" size="md" block onClick={() => window.print()}>
            <PrintIcon /> Imprimir etiqueta
          </Button>
        </section>
      </div>

      {/* Só aparece no papel: o @media print esconde o resto da página */}
      {createPortal(
        <div className="print-only">
          <PriceLabel {...label} printable />
        </div>,
        document.body,
      )}
    </Modal>
  );
}

const CopyIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
    <rect x="8" y="8" width="12" height="12" rx="2" />
    <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
  </svg>
);

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="m5 12 5 5 9-10" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const PrintIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
    <path d="M7 9V3h10v6M7 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2" strokeLinejoin="round" />
    <path d="M7 14h10v7H7z" strokeLinejoin="round" />
  </svg>
);
