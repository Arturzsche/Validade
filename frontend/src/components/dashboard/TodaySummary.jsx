// Cabeçalho do painel: de quem é a loja e o que fazer hoje, em linguagem de balcão.

const qty = (n, one, many) => `${n} ${n === 1 ? one : many}`;

function TodayMessage({ items }) {
  const promo = items.filter((b) => b.semaphore === 'red' && !b.expired).length;
  const expired = items.filter((b) => b.expired).length;
  const thisMonth = items.filter((b) => b.semaphore === 'yellow').length;
  const strong = 'font-semibold text-slate-900';

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
      <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Visão geral da loja</p>
      <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">{storeName}</h2>
      <p className="mt-2 max-w-xl text-base text-slate-600">
        <TodayMessage items={items} />
      </p>
    </header>
  );
}
