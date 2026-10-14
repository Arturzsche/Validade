import { Router } from 'express';
import { authenticate } from './middlewares/auth.js';
import authRoutes from './modules/auth/auth.routes.js';
import storeRoutes from './modules/stores/stores.routes.js';
import userRoutes from './modules/users/users.routes.js';
import productRoutes from './modules/products/products.routes.js';
import batchRoutes from './modules/batches/batches.routes.js';
import dashboardRoutes from './modules/dashboard/dashboard.routes.js';
import alertRoutes from './modules/alerts/alerts.routes.js';

const router = Router();

router.use('/auth', authRoutes);

// Tudo abaixo exige login e é automaticamente escopado pela loja do usuário
router.use(authenticate);
router.use('/stores', storeRoutes);
router.use('/users', userRoutes);
router.use('/products', productRoutes);
router.use('/batches', batchRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/alerts', alertRoutes);

export default router;
