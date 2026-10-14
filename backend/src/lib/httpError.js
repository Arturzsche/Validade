export class HttpError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const badRequest = (code, message, details) => new HttpError(400, code, message, details);
export const unauthorized = (message = 'Não autenticado') => new HttpError(401, 'UNAUTHORIZED', message);
export const forbidden = (message = 'Sem permissão') => new HttpError(403, 'FORBIDDEN', message);
export const notFound = (message = 'Recurso não encontrado') => new HttpError(404, 'NOT_FOUND', message);
export const conflict = (code, message) => new HttpError(409, code, message);
export const unprocessable = (code, message, details) => new HttpError(422, code, message, details);
