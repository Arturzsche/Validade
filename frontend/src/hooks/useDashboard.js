import { useCallback, useEffect, useRef, useState } from 'react';
import { api, errorMessage } from '../lib/api.js';

/**
 * Carrega o resumo do painel. Recarrega sozinho quando o app volta para a tela
 * (o dono costuma abrir, sair e voltar ao longo do dia).
 */
export function useDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const inFlight = useRef(null);

  const load = useCallback(async () => {
    inFlight.current?.abort();
    const controller = new AbortController();
    inFlight.current = controller;
    setRefreshing(true);
    try {
      const summary = await api('/dashboard/summary', { signal: controller.signal });
      setData(summary);
      setError(null);
    } catch (err) {
      if (err.name !== 'AbortError') setError(errorMessage(err));
    } finally {
      if (inFlight.current === controller) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    load();
    const onVisible = () => document.visibilityState === 'visible' && load();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      inFlight.current?.abort();
    };
  }, [load]);

  return { data, error, loading, refreshing, refresh: load };
}
