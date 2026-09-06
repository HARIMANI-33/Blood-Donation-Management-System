import { Router } from 'express';
import { register, login, me, googleAuth, changePassword } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// POST /api/auth/register
router.post('/register', register);

// POST /api/auth/login
router.post('/login', login);

// POST /api/auth/google
router.post('/google', googleAuth);

// GET /api/auth/me
router.get('/me', authenticate, me);

// POST /api/auth/change-password
router.post('/change-password', authenticate, changePassword);

export default router;

