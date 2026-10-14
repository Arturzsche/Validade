import { useRef, useState } from 'react';
import Modal from '../ui/Modal.jsx';
import Button from '../ui/Button.jsx';
import ProductThumb from '../ui/ProductThumb.jsx';
import { describeDays } from '../ui/SemaphoreBadge.jsx';
import { brl } from '../../lib/money.js';
import { copyText } from '../../lib/clipboard.js';
import { buildPromoText, DISCOUNT_OPTIONS, promoNumbers } from '../../lib/promo.js';

/**
 * "Salvar dinheiro": gera o texto da promoção de queima de estoque com o desconto
 * padrão da loja (ajustável), mostra quanto ainda dá para recuperar e copia para o WhatsApp.
 */
export default function PromoModal({ batch, storeName, defaultDiscountPct, onClose }) {
  // O pai monta com key={batch.id}: cada lote começa limpo, com o desconto padrão da loja
  const [discountPct, setDiscountPct] = useState(defaultDiscountPct);
  const [editedText, setEditedText] = useState(null); // null = usa o texto gerado
  const [copyState, setCopyState] = useState('idle'); // idle | copied | failed
  const textareaRef = useRef(null);

  const options = [...new Set([...DISCOUNT_OPTIONS, defaultDiscountPct])].sort((a, b) => a - b);

  if (!batch) return null;
  const n = promoNumbers(batch, discountPct);
  const text = editedText ?? buildPromoText({ batch, storeName, discountPct });

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
    <Modal open={Boolean(batch)} onClose={onClose} title="Gerar promoção" subtitle="Transforme o prejuízo em venda antes do vencimento.">
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <ProductThumb src={batch.product.imageUrl} name={batch.product.name} size="md" />
          <div className="min-w-0">
            <p className="truncate font-semibold text-slate-900">{batch.product.name}</p>
            <p className="text-sm font-medium text-red-700">
              {describeDays(batch.daysToExpiry)} · {batch.quantity} un.
            </p>
          </div>
        </div>

        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-slate-700">Desconto</legend>
          <div className="flex gap-2">
            {options.map((pct) => (
              <button
                key={pct}
                type="button"
                aria-pressed={discountPct === pct}
                onClick={() => chooseDiscount(pct)}
                className={`h-11 flex-1 rounded-xl text-sm font-bold ring-1 transition-colors ${
                  discountPct === pct ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-700 ring-slate-300 active:bg-slate-100'
                }`}
              >
                {pct}%
              </button>
            ))}
          </div>
        </fieldset>

        <div className="grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <div>
            <p className="text-xs font-medium text-slate-500">Preço promocional</p>
            <p className="text-lg font-bold tabular-nums text-slate-900">
              {brl(n.promoPrice)} <span className="text-sm font-normal text-slate-400 line-through">{brl(n.price)}</span>
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Vendendo tudo, entra</p>
            <p className="text-lg font-bold tabular-nums text-emerald-700">{brl(n.recovered)}</p>
          </div>
          <p className="col-span-2 text-sm text-slate-600">
            {n.belowCost ? (
              <>
                ⚠️ Abaixo do custo, mas ainda salva {brl(n.recovered)} dos <strong>{brl(n.loss)}</strong> que iriam para o lixo.
              </>
            ) : (
              <>
                Em vez de perder <strong className="text-red-700">{brl(n.loss)}</strong> em mercadoria vencida.
              </>
            )}
          </p>
        </div>

        <div>
          <label htmlFor="promo-text" className="mb-2 block text-sm font-semibold text-slate-700">
            Mensagem (pode editar)
          </label>
          <textarea
            id="promo-text"
            ref={textareaRef}
            value={text}
            onChange={(e) => {
              setEditedText(e.target.value);
              setCopyState('idle');
            }}
            rows={8}
            className="w-full resize-none rounded-2xl rounded-tr-sm border-0 bg-[#dcf8c6] p-4 font-sans text-[15px] leading-relaxed text-slate-900 shadow-sm ring-1 ring-emerald-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </div>

        {/* Ação principal sempre visível no rodapé da gaveta, mesmo com o texto longo */}
        <div className="sticky -bottom-[max(1.25rem,env(safe-area-inset-bottom))] -mx-5 space-y-1 border-t border-slate-200 bg-white px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:-bottom-6 sm:pb-6">
          <Button block onClick={handleCopy} className="!bg-[#25d366] !text-slate-900 active:!bg-[#1ebe5a]">
            {copyState === 'copied' ? '✓ Copiado! Cole no WhatsApp' : 'Copiar para o WhatsApp'}
          </Button>
          {copyState === 'failed' && (
            <p role="alert" className="text-center text-sm font-medium text-red-600">
              Não foi possível copiar automaticamente. O texto foi selecionado: copie manualmente.
            </p>
          )}
          <a
            href={`https://wa.me/?text=${encodeURIComponent(text)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-11 w-full items-center justify-center rounded-2xl text-sm font-semibold text-emerald-800 active:bg-emerald-50"
          >
            Ou abrir direto no WhatsApp ↗
          </a>
        </div>
      </div>
    </Modal>
  );
}
