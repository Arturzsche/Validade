import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { unauthorized } from '../../lib/httpError.js';
import { phone } from '../../lib/schemas.js';
import { authenticate, signToken } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';

const router = Router();

const registerSchema = z.object({
  name: z.string().trim().min(2),
  email: z.email().toLowerCase(),
  password: z.string().min(8, 'Senha com no mínimo 8 caracteres'),
  phone: phone.optional(),
});

const loginSchema = z.object({
  email: z.email().toLowerCase(),
  password: z.string().min(1),
});

const publicUser = ({ id, name, email, phone: tel }) => ({ id, name, email, phone: tel ?? null });

// POST /api/auth/register — cadastro self-service do prestador
router.post('/register', validate({ body: registerSchema }), async (req, res) => {
  const { password, ...data } = req.valid.body;
  const user = await prisma.user.create({ data: { ...data, passwordHash: await bcrypt.hash(password, 10) } });
  res.status(201).json({ token: signToken(user), user: publicUser(user) });
});

// POST /api/auth/login
router.post('/login', validate({ body: loginSchema }), async (req, res) => {
  const { email, password } = req.valid.body;
  const user = await prisma.user.findUnique({ where: { email } });
  const ok = user && (await bcrypt.compare(password, user.passwordHash));
  if (!ok) throw unauthorized('E-mail ou senha inválidos');
  res.json({ token: signToken(user), user: publicUser(user) });
});

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

export default router;
