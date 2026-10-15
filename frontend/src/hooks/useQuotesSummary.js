import { useCallback, useEffect, useRef, useState } from 'react';
import { api, errorMessage } from '../lib/api.js';

/** Números do Dashboard (GET /quotes/summary). Mantém o último dado se uma atualização falhar. */
export function useQuotesSummary() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    try {
      const summary = await api('/quotes/summary');
      if (id !== requestId.current) return;
      setData(summary);
      setError(null);
    } catch (err) {
      if (id === requestId.current) setError(errorMessage(err));
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { data, error, loading, reload: load };
}
