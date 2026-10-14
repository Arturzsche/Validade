// Cliente HTTP fino sobre fetch. Erros da API viram ApiError com status + code
// (ex: 422 PRODUCT_NOT_FOUND), que as telas usam para decidir o fluxo.

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api';

export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

let authToken = null;
let onUnauthorized = () => {};

export function configureApi({ token, onUnauthorized: handler }) {
  authToken = token ?? null;
  if (handler) onUnauthorized = handler;
}

export async function api(path, { method = 'GET', body, signal } = {}) {
  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      signal,
      headers: {
        ...(body !== undefined && { 'Content-Type': 'application/json' }),
        ...(authToken && { Authorization: `Bearer ${authToken}` }),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new ApiError(0, 'NETWORK_ERROR', 'Sem conexão com o servidor. Verifique a internet.');
  }

  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const error = data?.error ?? {};
    if (res.status === 401 && authToken) onUnauthorized();
    throw new ApiError(res.status, error.code ?? 'HTTP_ERROR', error.message ?? 'Erro inesperado', error.details);
  }
  return data;
}

/** Primeira mensagem legível de um erro (inclui detalhes de validação do backend). */
export function errorMessage(err) {
  if (err instanceof ApiError && err.code === 'VALIDATION_ERROR' && err.details?.length) {
    return err.details[0].message;
  }
  return err?.message ?? 'Algo deu errado';
}
