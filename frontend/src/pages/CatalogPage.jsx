import { useCallback, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { Link } from 'react-router-dom';
import { useCatalog } from '../hooks/useCatalog.js';
import AppShell from '../components/layout/AppShell.jsx';
import CatalogItem from '../components/catalog/CatalogItem.jsx';
import EditProductModal from '../components/catalog/EditProductModal.jsx';
import DeleteProductModal from '../components/catalog/DeleteProductModal.jsx';
import Button from '../components/ui/Button.jsx';
import Toast from '../components/ui/Toast.jsx';

/**
 * Tela 3 — Catálogo: todos os produtos já registrados na loja, com edição e exclusão.
 * Operador vê e corrige o cadastro (sem custo, sem alterar preço, sem excluir).
 */
export default function CatalogPage() {
  const { session } = useAuth();
  const isOwner = session.user.role === 'OWNER';
  const [search, setSearch] = useState('');
  const catalog = useCatalog(search);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [toast, setToast] = useState(null);
  const dismissToast = useCallback(() => setToast(null), []);

  const count = `${catalog.total} ${catalog.total === 1 ? 'produto' : 'produtos'}`;

  return (
    <AppShell title="Catálogo">
      <main className="mx-auto max-w-3xl space-y-5 px-4 py-6 md:py-10">
        <header className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-stone-900">Catálogo</h1>
            <p className="mt-1 text-sm text-stone-500">
              {search.trim()
                ? `${count} ${catalog.total === 1 ? 'encontrado' : 'encontrados'}`
                : `${count} ${catalog.total === 1 ? 'cadastrado' : 'cadastrados'} na loja`}
            </p>
          </div>
        </header>

        <label className="relative block">
          <span className="sr-only">Buscar produto</span>
          <svg viewBox="0 0 20 20" className="pointer-events-none absolute top-1/2 left-3.5 h-5 w-5 -translate-y-1/2 text-stone-400" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <circle cx="9" cy="9" r="5.5" />
            <path d="m13.5 13.5 3 3" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome ou código de barras"
            className="h-12 w-full rounded-xl border-0 bg-white pr-4 pl-11 text-stone-900 ring-1 ring-inset ring-stone-300 placeholder:text-stone-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </label>

        {catalog.error && !catalog.items.length && (
          <div className="rounded-2xl bg-white px-6 py-10 text-center shadow-card ring-1 ring-stone-200">
            <p className="font-semibold text-stone-900">Não foi possível carregar o catálogo</p>
            <p className="mt-1 text-sm text-stone-500">{catalog.error}</p>
            <Button className="mt-5" size="md" onClick={catalog.reload}>
              Tentar de novo
            </Button>
          </div>
        )}

        {!catalog.loading && !catalog.error && catalog.items.length === 0 && (
          <div className="rounded-2xl bg-white px-6 py-12 text-center shadow-card ring-1 ring-stone-200">
            {search.trim() ? (
              <>
                <p className="font-semibold text-stone-900">Nenhum produto encontrado</p>
                <p className="mt-1 text-sm text-stone-500">Confira o nome ou o código de barras.</p>
              </>
            ) : (
              <>
                <p className="font-semibold text-stone-900">Seu catálogo está vazio</p>
                <p className="mt-1 text-sm text-stone-500">
                  Os produtos entram aqui automaticamente quando você registra a validade pela primeira vez.
                </p>
                <Link
                  to="/entrada"
                  className="mt-5 inline-flex h-12 items-center rounded-xl bg-emerald-600 px-6 font-semibold text-white hover:bg-emerald-700"
                >
                  Registrar um produto
                </Link>
              </>
            )}
          </div>
        )}

        {catalog.items.length > 0 && (
          <ul
            aria-label="Produtos do catálogo"
            aria-busy={catalog.loading}
            className={`divide-y divide-stone-100 overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-stone-200 transition-opacity ${
              catalog.loading ? 'opacity-60' : ''
            }`}
          >
            {catalog.items.map((product) => (
              <CatalogItem key={product.id} product={product} onEdit={setEditing} onDelete={isOwner ? setDeleting : undefined} />
            ))}
          </ul>
        )}

        {catalog.loading && !catalog.items.length && !catalog.error && (
          <div className="h-64 animate-pulse rounded-2xl bg-stone-200/80" aria-label="Carregando catálogo" />
        )}

        {catalog.hasMore && (
          <Button variant="secondary" size="md" block onClick={catalog.loadMore} loading={catalog.loading}>
            Mostrar mais
          </Button>
        )}
      </main>

      {editing && (
        <EditProductModal
          key={editing.id}
          product={editing}
          canEditPrices={isOwner}
          onClose={() => setEditing(null)}
          onPhotoChanged={(updated) => catalog.replace(updated)}
          onSaved={(updated) => {
            catalog.replace(updated);
            setEditing(null);
            setToast({ tone: 'success', title: 'Produto atualizado', message: updated.name });
          }}
        />
      )}

      {deleting && (
        <DeleteProductModal
          key={deleting.id}
          product={deleting}
          onClose={() => setDeleting(null)}
          onDeleted={(product) => {
            catalog.remove(product.id);
            setDeleting(null);
            setToast({ tone: 'success', title: 'Produto excluído do catálogo', message: product.name });
          }}
        />
      )}

      <Toast toast={toast} onDismiss={dismissToast} />
    </AppShell>
  );
}
