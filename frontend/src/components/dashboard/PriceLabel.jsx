import { formatDateBR } from '../../lib/dates.js';
import { promoName } from '../../lib/promo.js';

const parts = (value) => {
  const [int, cents] = value.toFixed(2).split('.');
  return { int: Number(int).toLocaleString('pt-BR'), cents };
};

/**
 * Etiqueta de gôndola da promoção (≈ 9 × 6 cm impressa). Preto no branco para sair
 * bem em qualquer impressora, inclusive térmica. A validade aparece por transparência
 * com o cliente (produto perto de vencer vendido com desconto).
 */
export default function PriceLabel({ batch, promoPrice, price, discountPct, storeName, printable = false }) {
  const { int, cents } = parts(promoPrice);
  return (
    <div
      className={`flex flex-col overflow-hidden bg-white text-black ${
        printable ? 'w-[90mm] border-2 border-dashed border-black' : 'w-full rounded-lg ring-1 ring-stone-300'
      }`}
      data-testid={printable ? 'print-label' : 'label-preview'}
    >
      <div className="flex items-center justify-between bg-black px-3 py-1.5 text-white">
        <span className="text-sm font-extrabold tracking-[0.2em]">OFERTA</span>
        <span className="text-sm font-bold">-{discountPct}%</span>
      </div>
      <div className="px-3 pt-2 pb-3">
        <p className="line-clamp-2 text-base leading-tight font-semibold">{promoName(batch.product)}</p>
        <div className="mt-1 flex items-end justify-between gap-2">
          <p className="text-sm text-stone-600">
            de <span className="line-through">R$ {price.toFixed(2).replace('.', ',')}</span>
            <br />
            por
          </p>
          <p className="flex items-start leading-none font-extrabold tabular-nums">
            <span className="mt-1.5 mr-1 text-base">R$</span>
            <span className="text-5xl tracking-tight">{int}</span>
            <span className="mt-1 text-2xl">,{cents}</span>
          </p>
        </div>
        <p className="mt-2 border-t border-black/20 pt-1.5 text-[11px] leading-snug">
          Válido enquanto durar o estoque · Validade {formatDateBR(batch.expiryDate)}
          {storeName && <> · {storeName}</>}
        </p>
      </div>
    </div>
  );
}
