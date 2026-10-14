import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { unauthorized } from '../../lib/httpError.js';
import { phone } from '../../lib/schemas.js';
import { serializeStore } from '../../lib/serializers.js';
import { authenticate, signToken } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';

const router = Router();

const registerSchema = z.object({
  storeName: z.string().trim().min(2),
  document: z.string().regex(/^\d{14}$/, 'CNPJ com 14 dígitos').optional(),
  segment: z.string().trim().max(40).optional(),
  whatsappPhone: phone.optional(),
  name: z.string().trim().min(2),
  email: z.email().toLowerCase(),
  password: z.string().min(8, 'Senha com no mínimo 8 caracteres'),
});

const loginSchema = z.object({
  email: z.email().toLowerCase(),
  password: z.string().min(1),
});

const publicUser = ({ id, name, email, role, storeId }) => ({ id, name, email, role, storeId });

// POST /api/auth/register — cria a loja e o usuário dono (onboarding self-service)
router.post('/register', validate({ body: registerSchema }), async (req, res) => {
  const { storeName, document, segment, whatsappPhone, name, email, password } = req.valid.body;
  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: 'OWNER',
      store: { create: { name: storeName, document, segment, whatsappPhone } },
    },
    include: { store: true },
  });

  res.status(201).json({ token: signToken(user), user: publicUser(user), store: serializeStore(user.store) });
});

// POST /api/auth/login
router.post('/login', validate({ body: loginSchema }), async (req, res) => {
  const { email, password } = req.valid.body;
  const user = await prisma.user.findUnique({ where: { email }, include: { store: true } });

  const ok = user && user.active && (await bcrypt.compare(password, user.passwordHash));
  if (!ok) throw unauthorized('E-mail ou senha inválidos');

  res.json({ token: signToken(user), user: publicUser(user), store: serializeStore(user.store) });
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.id }, include: { store: true } });
  res.json({ user: publicUser(user), store: serializeStore(user.store) });
});

export default router;
