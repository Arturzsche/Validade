import { useCallback, useEffect, useRef, useState } from 'react';
import { api, errorMessage } from '../lib/api.js';

const PAGE_SIZE = 30;

/** Catálogo paginado com busca (nome ou código de barras), com debounce na digitação. */
export function useCatalog(search) {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const request = useRef(0);

  const load = useCallback(async (term, nextPage) => {
    const id = ++request.current;
    setLoading(true);
    try {
      const qs = new URLSearchParams({ page: String(nextPage), pageSize: String(PAGE_SIZE), ...(term && { search: term }) });
      const data = await api(`/products?${qs}`);
      if (id !== request.current) return; // resposta de uma busca antiga
      setItems((prev) => (nextPage === 1 ? data.items : [...prev, ...data.items]));
      setTotal(data.total);
      setPage(nextPage);
      setError(null);
    } catch (err) {
      if (id === request.current) setError(errorMessage(err));
    } finally {
      if (id === request.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(search.trim(), 1), search ? 300 : 0);
    return () => clearTimeout(t);
  }, [search, load]);

  return {
    items,
    total,
    loading,
    error,
    hasMore: items.length < total,
    loadMore: () => load(search.trim(), page + 1),
    reload: () => load(search.trim(), 1),
    replace: (product) => setItems((list) => list.map((p) => (p.id === product.id ? { ...p, ...product } : p))),
    remove: (id) => {
      setItems((list) => list.filter((p) => p.id !== id));
      setTotal((n) => n - 1);
    },
  };
}
