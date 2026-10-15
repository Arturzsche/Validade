/**
 * A frase que o dono lê primeiro: o que fazer hoje, em linguagem de balcão.
 */
function greeting(now = new Date()) {
  const h = now.getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

const qty = (n, one, many) => `${n} ${n === 1 ? one : many}`;

export default function TodaySummary({ name, items }) {
  const firstName = name?.split(' ')[0];
  const promo = items.filter((b) => b.semaphore === 'red' && !b.expired).length;
  const expired = items.filter((b) => b.expired).length;
  const thisMonth = items.filter((b) => b.semaphore === 'yellow').length;

  let message;
  if (promo || expired) {
    const parts = [];
    if (promo) parts.push(<strong key="p" className="font-semibold text-slate-900">{qty(promo, 'produto', 'produtos')} para colocar em promoção</strong>);
    if (expired) {
      // "3 produtos para colocar em promoção e 1 para tirar…" / sozinho: "1 produto para tirar…"
      const label = promo ? `${expired} para tirar da prateleira` : `${qty(expired, 'produto', 'produtos')} para tirar da prateleira`;
      parts.push(<strong key="e" className="font-semibold text-slate-900">{label}</strong>);
    }
    message = (
      <>
        Hoje você tem {parts[0]}
        {parts[1] && <> e {parts[1]}</>}.
      </>
    );
  } else if (thisMonth) {
    message = <>Nada urgente hoje. {qty(thisMonth, 'produto vence', 'produtos vencem')} este mês, fique de olho.</>;
  } else {
    message = <>Tudo em dia. Nenhum produto perto de vencer. 🎉</>;
  }

  return (
    <header>
      <h2 className="text-2xl font-bold tracking-tight text-slate-900">
        {greeting()}
        {firstName ? `, ${firstName}` : ''}
      </h2>
      <p className="mt-1 text-base text-slate-600">{message}</p>
    </header>
  );
}
