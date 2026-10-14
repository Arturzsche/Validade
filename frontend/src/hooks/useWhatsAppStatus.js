import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { channelLevel } from '../lib/whatsapp.js';

/** Consulta o estado do canal a cada `intervalMs` (e ao voltar para o app). */
export function useWhatsAppStatus({ enabled, intervalMs = 30_000 }) {
  const [status, setStatus] = useState(null);

  const refresh = useCallback(async () => {
    try {
      setStatus(await api('/notifications/status'));
    } catch {
      setStatus(null); // servidor fora do ar: indicador neutro
    }
  }, []);

  useEffect(() => {
    if (!enabled) return undefined;
    refresh();
    const id = setInterval(() => document.visibilityState === 'visible' && refresh(), intervalMs);
    const onVisible = () => document.visibilityState === 'visible' && refresh();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [enabled, intervalMs, refresh]);

  return { status, level: channelLevel(status), setStatus, refresh };
}
