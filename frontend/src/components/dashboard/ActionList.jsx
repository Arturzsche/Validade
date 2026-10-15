import ActionItem from './ActionItem.jsx';

function Group({ title, dot, hint, items, onPromo }) {
  if (!items.length) return null;
  return (
    <section aria-label={title}>
      <h3 className="mb-2 flex items-baseline gap-2 px-1">
        <span className="self-center text-lg leading-none" aria-hidden="true">{dot}</span>
        <span className="font-black text-stone-900">{title}</span>
        <span className="text-sm text-stone-500">
          {items.length} {items.length === 1 ? 'item' : 'itens'} · {hint}
        </span>
      </h3>
      <ul className="divide-y-2 divide-dashed divide-stone-100 overflow-hidden rounded-3xl bg-white shadow-card ring-1 ring-stone-900/5">
        {items.map((batch) => (
          <ActionItem key={batch.id} batch={batch} onPromo={onPromo} />
        ))}
      </ul>
    </section>
  );
}

/** O que fazer, do mais urgente para o menos. Produtos com validade folgada não aparecem. */
export default function ActionList({ items, total, thresholds, onPromo }) {
  const urgent = items.filter((b) => b.semaphore === 'red');
  const thisMonth = items.filter((b) => b.semaphore === 'yellow');

  if (!items.length) {
    return (
      <div className="rounded-3xl bg-white px-6 py-12 text-center shadow-card ring-1 ring-stone-900/5">
        <p className="text-5xl motion-safe:animate-float" aria-hidden="true">🎉</p>
        <p className="mt-2 font-semibold text-stone-900">Nada para resolver</p>
        <p className="mt-1 text-sm text-stone-500">Quando algum produto estiver perto de vencer, ele aparece aqui.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-black text-stone-900">O que fazer agora <span aria-hidden="true">👇</span></h2>
      <Group
        title="Ação urgente"
        dot="🔥"
        hint={`vence em até ${thresholds.criticalDays - 1} dias`}
        items={urgent}
        onPromo={onPromo}
      />
      <Group title="Vence este mês" dot="📅" hint="fique de olho" items={thisMonth} onPromo={onPromo} />
      {total > items.length && (
        <p className="text-center text-sm text-stone-500">
          Mostrando os {items.length} primeiros de {total} itens.
        </p>
      )}
    </div>
  );
}
