import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import { unauthorized } from '../lib/httpError.js';

export function signToken(user) {
  return jwt.sign({}, env.JWT_SECRET, { subject: user.id, expiresIn: env.JWT_EXPIRES_IN });
}

/** Exige Bearer token válido e carrega `req.user` (o prestador = escopo de todos os dados). */
export async function authenticate(req, _res, next) {
  const [scheme, token] = (req.headers.authorization ?? '').split(' ');
  if (scheme !== 'Bearer' || !token) throw unauthorized();

  let payload;
  try {
    payload = jwt.verify(token, env.JWT_SECRET);
  } catch {
    throw unauthorized('Token inválido ou expirado');
  }

  // Recarrega o usuário: conta removida perde o acesso na hora
  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, name: true, email: true, phone: true },
  });
  if (!user) throw unauthorized('Usuário não encontrado');

  req.user = user;
  next();
}
