import ActionItem from './ActionItem.jsx';

function Group({ title, dot, hint, items, onPromo }) {
  if (!items.length) return null;
  return (
    <section aria-label={title}>
      <h3 className="mb-2 flex items-center gap-2 px-1 text-sm">
        <span className={`h-2 w-2 rounded-full ${dot}`} aria-hidden="true" />
        <span className="font-semibold text-stone-900">{title}</span>
        <span className="text-stone-500">
          · {items.length} {items.length === 1 ? 'item' : 'itens'} · {hint}
        </span>
      </h3>
      <ul className="divide-y divide-stone-100 overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-stone-200">
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
      <div className="rounded-2xl border border-dashed border-stone-300 px-6 py-12 text-center">
        <p className="font-medium text-stone-900">Nada para resolver</p>
        <p className="mt-1 text-sm text-stone-500">Quando algum produto estiver perto de vencer, ele aparece aqui.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-stone-900">O que fazer agora</h2>
      <Group
        title="Ação urgente"
        dot="bg-red-500"
        hint={`vence em até ${thresholds.criticalDays - 1} dias`}
        items={urgent}
        onPromo={onPromo}
      />
      <Group title="Vence este mês" dot="bg-amber-500" hint="fique de olho" items={thisMonth} onPromo={onPromo} />
      {total > items.length && (
        <p className="text-center text-sm text-stone-500">
          Mostrando os {items.length} primeiros de {total} itens.
        </p>
      )}
    </div>
  );
}
