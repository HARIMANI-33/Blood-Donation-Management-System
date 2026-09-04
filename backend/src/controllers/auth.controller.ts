import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { createUser, findUserByEmail, findUserById, toPublicUser, BloodGroup, UserRole } from '../models/user.model';
import { signToken } from '../utils/jwt';
import { AuthenticatedRequest } from '../middleware/auth';

const VALID_BLOOD_GROUPS: BloodGroup[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const VALID_ROLES: UserRole[] = ['donor', 'hospital', 'staff', 'admin'];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/auth/register
 */
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, phone, bloodGroup, role } = req.body ?? {};

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      res.status(400).json({ success: false, message: 'Name must be at least 2 characters' });
      return;
    }
    if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email)) {
      res.status(400).json({ success: false, message: 'A valid email is required' });
      return;
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
      return;
    }
    if (bloodGroup && !VALID_BLOOD_GROUPS.includes(bloodGroup)) {
      res.status(400).json({ success: false, message: 'Invalid blood group' });
      return;
    }
    if (role && !VALID_ROLES.includes(role)) {
      res.status(400).json({ success: false, message: 'Invalid role' });
      return;
    }

    const existing = await findUserByEmail(email);
    if (existing) {
      res.status(409).json({ success: false, message: 'An account with this email already exists' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await createUser({
      name: name.trim(),
      email,
      passwordHash,
      phone: phone ?? null,
      bloodGroup: bloodGroup ?? null,
      role: role ?? 'donor'
    });

    const token = signToken({ userId: user.id, role: user.role });

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: { user: toPublicUser(user), token }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, message: 'Registration failed', error: message });
  }
};

/**
 * POST /api/auth/login
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body ?? {};

    if (!email || !password) {
      res.status(400).json({ success: false, message: 'Email and password are required' });
      return;
    }

    const user = await findUserByEmail(email);
    if (!user) {
      res.status(401).json({ success: false, message: 'Invalid email or password' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      res.status(401).json({ success: false, message: 'Invalid email or password' });
      return;
    }

    const token = signToken({ userId: user.id, role: user.role });

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: { user: toPublicUser(user), token }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, message: 'Login failed', error: message });
  }
};

/**
 * GET /api/auth/me
 * Requires the `authenticate` middleware to have run first.
 */
export const me = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const user = await findUserById(req.user.userId);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    res.status(200).json({ success: true, data: { user: toPublicUser(user) } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, message: 'Failed to fetch profile', error: message });
  }
};
