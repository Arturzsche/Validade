// Cabeçalho do painel: de quem é a loja e o que fazer hoje, em linguagem de balcão.

const qty = (n, one, many) => `${n} ${n === 1 ? one : many}`;

function TodayMessage({ items }) {
  const promo = items.filter((b) => b.semaphore === 'red' && !b.expired).length;
  const expired = items.filter((b) => b.expired).length;
  const thisMonth = items.filter((b) => b.semaphore === 'yellow').length;
  const strong = 'font-black text-stone-900';

  if (promo || expired) {
    const expiredLabel = promo
      ? `${expired} para tirar da prateleira`
      : `${qty(expired, 'produto', 'produtos')} para tirar da prateleira`;
    return (
      <>
        Hoje você tem {promo > 0 && <strong className={strong}>{qty(promo, 'produto', 'produtos')} para colocar em promoção</strong>}
        {promo > 0 && expired > 0 && ' e '}
        {expired > 0 && <strong className={strong}>{expiredLabel}</strong>}.
      </>
    );
  }
  if (thisMonth) return <>Nada urgente hoje. {qty(thisMonth, 'produto vence', 'produtos vencem')} este mês, fique de olho.</>;
  return <>Tudo em dia. Nenhum produto perto de vencer. 🎉</>;
}

export default function TodaySummary({ storeName, items }) {
  return (
    <header>
      <p className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-amber-800"><span aria-hidden="true">🏪</span> Visão geral da loja</p>
      <h2 className="mt-2 text-3xl font-black tracking-tight text-stone-900 md:text-4xl">{storeName}</h2>
      <p className="mt-2 max-w-xl text-base font-semibold text-stone-600">
        <TodayMessage items={items} />
      </p>
    </header>
  );
}
