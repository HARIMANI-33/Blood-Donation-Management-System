import { Router } from 'express';
import { getStats } from '../controllers/dashboard.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// GET /api/dashboard/stats
router.get('/stats', authenticate, getStats);

export default router;
