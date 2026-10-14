import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { idParams } from '../../lib/schemas.js';
import { requireOwner } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';

const router = Router();
router.use(requireOwner);

const select = { id: true, name: true, email: true, role: true, active: true, createdAt: true };

const createSchema = z.object({
  name: z.string().trim().min(2),
  email: z.email().toLowerCase(),
  password: z.string().min(8),
  role: z.enum(['OWNER', 'OPERATOR']).default('OPERATOR'),
});

const updateSchema = z.object({
  name: z.string().trim().min(2),
  active: z.boolean(),
  role: z.enum(['OWNER', 'OPERATOR']),
}).partial();

// GET /api/users — equipe da loja
router.get('/', async (req, res) => {
  const users = await prisma.user.findMany({ where: { storeId: req.user.storeId }, select, orderBy: { name: 'asc' } });
  res.json(users);
});

// POST /api/users — dono cadastra operador de caixa
router.post('/', validate({ body: createSchema }), async (req, res) => {
  const { password, ...data } = req.valid.body;
  const user = await prisma.user.create({
    data: { ...data, storeId: req.user.storeId, passwordHash: await bcrypt.hash(password, 10) },
    select,
  });
  res.status(201).json(user);
});

// PATCH /api/users/:id — renomear, (des)ativar, trocar papel
router.patch('/:id', validate({ params: idParams, body: updateSchema }), async (req, res) => {
  const { id } = req.valid.params;
  if (id === req.user.id && (req.valid.body.active === false || req.valid.body.role === 'OPERATOR')) {
    return res.status(400).json({ error: { code: 'SELF_LOCKOUT', message: 'Você não pode se desativar ou rebaixar' } });
  }
  // updateMany com storeId garante isolamento entre lojas
  const { count } = await prisma.user.updateMany({ where: { id, storeId: req.user.storeId }, data: req.valid.body });
  if (!count) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Usuário não encontrado' } });
  res.json(await prisma.user.findUnique({ where: { id }, select }));
});

export default router;
