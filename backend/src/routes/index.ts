import { Router } from 'express';
import healthRoutes from './health.routes';
import authRoutes from './auth.routes';
import dashboardRoutes from './dashboard.routes';

const router = Router();

// Mount health route under /health (accessed via /api/health from app.ts)
router.use('/health', healthRoutes);

// Mount auth routes under /auth (accessed via /api/auth from app.ts)
router.use('/auth', authRoutes);

// Mount dashboard routes under /dashboard (accessed via /api/dashboard from app.ts)
router.use('/dashboard', dashboardRoutes);

export default router;
