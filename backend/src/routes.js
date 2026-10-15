import { Router } from 'express';
import { authenticate } from './middlewares/auth.js';
import authRoutes from './modules/auth/auth.routes.js';
import clientRoutes from './modules/clients/clients.routes.js';
import quoteRoutes from './modules/quotes/quotes.routes.js';
import notificationRoutes from './modules/notifications/notifications.routes.js';

const router = Router();

router.use('/auth', authRoutes);

// Tudo abaixo exige login e é escopado pelo prestador logado
router.use(authenticate);
router.use('/clients', clientRoutes);
router.use('/quotes', quoteRoutes);
router.use('/notifications', notificationRoutes);

export default router;
