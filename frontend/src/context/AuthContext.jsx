import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { api, configureApi } from '../lib/api.js';

const STORAGE_KEY = 'validade.session';
const AuthContext = createContext(null);

function loadSession() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? null;
  } catch {
    return null;
  }
}

function persist(session) {
  try {
    if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // modo privado / storage bloqueado: segue só em memória
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(loadSession);

  const logout = useCallback(() => {
    persist(null);
    configureApi({ token: null });
    setSession(null);
  }, []);

  // Configura o token de forma síncrona para que o primeiro request já saia autenticado
  configureApi({ token: session?.token, onUnauthorized: logout });

  const start = useCallback((data) => {
    const next = { token: data.token, user: data.user, store: data.store };
    persist(next);
    configureApi({ token: next.token });
    setSession(next);
  }, []);

  const login = useCallback(
    async (email, password) => start(await api('/auth/login', { method: 'POST', body: { email, password } })),
    [start],
  );

  const register = useCallback(
    async (payload) => start(await api('/auth/register', { method: 'POST', body: payload })),
    [start],
  );

  /** Atualiza os dados da loja na sessão (ex: após PATCH /stores/me). */
  const updateStore = useCallback((store) => {
    setSession((current) => {
      if (!current) return current;
      const next = { ...current, store };
      persist(next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ session, login, register, logout, updateStore }),
    [session, login, register, logout, updateStore],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>');
  return ctx;
}
