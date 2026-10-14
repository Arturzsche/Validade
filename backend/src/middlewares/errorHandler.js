import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { HttpError } from '../lib/httpError.js';

export function notFoundHandler(req, res) {
  res.status(404).json({ error: { code: 'ROUTE_NOT_FOUND', message: `${req.method} ${req.path} não existe` } });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: { code: err.code, message: err.message, details: err.details } });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Dados inválidos',
        details: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      },
    });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: { code: 'ALREADY_EXISTS', message: 'Registro duplicado', details: err.meta } });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Recurso não encontrado' } });
    }
    if (err.code === 'P2003') {
      return res.status(409).json({ error: { code: 'IN_USE', message: 'Registro possui vínculos e não pode ser removido' } });
    }
  }

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { code: 'INVALID_JSON', message: 'JSON malformado' } });
  }

  console.error(err);
  return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro interno' } });
}
