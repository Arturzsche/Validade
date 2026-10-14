import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import { forbidden, unauthorized } from '../lib/httpError.js';

export function signToken(user) {
  return jwt.sign({ storeId: user.storeId, role: user.role }, env.JWT_SECRET, {
    subject: user.id,
    expiresIn: env.JWT_EXPIRES_IN,
  });
}

/** Exige Bearer token válido e carrega `req.user` (com storeId = escopo do tenant). */
export async function authenticate(req, _res, next) {
  const [scheme, token] = (req.headers.authorization ?? '').split(' ');
  if (scheme !== 'Bearer' || !token) throw unauthorized();

  let payload;
  try {
    payload = jwt.verify(token, env.JWT_SECRET);
  } catch {
    throw unauthorized('Token inválido ou expirado');
  }

  // Recarrega o usuário para respeitar desativação/troca de papel imediatamente
  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, storeId: true, role: true, name: true, email: true, active: true },
  });
  if (!user || !user.active) throw unauthorized('Usuário inativo');

  req.user = user;
  next();
}

export const requireRole = (...roles) => (req, _res, next) => {
  if (!roles.includes(req.user?.role)) throw forbidden();
  next();
};

export const requireOwner = requireRole('OWNER');
