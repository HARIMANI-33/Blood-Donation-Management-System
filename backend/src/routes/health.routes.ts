import { Router } from 'express';
import { getHealth } from '../controllers/health.controller';
import { getDbHealth } from '../controllers/health.controller';

const router = Router();

// GET /api/health
router.get('/', getHealth);

// GET /api/health/db
router.get('/db', getDbHealth);

export default router;
