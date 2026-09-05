import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { createUser, findUserByEmail, findUserById, toPublicUser, BloodGroup, UserRole } from '../models/user.model';
import { signToken } from '../utils/jwt';
import { AuthenticatedRequest } from '../middleware/auth';
import { config } from '../config/environment';

const VALID_BLOOD_GROUPS: BloodGroup[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const VALID_ROLES: UserRole[] = ['donor', 'hospital', 'staff', 'admin'];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/auth/register
 */
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, phone, bloodGroup, role, age, city } = req.body ?? {};

    if (age !== undefined && age !== null && age !== '') {
      const parsedAge = Number(age);
      if (isNaN(parsedAge) || parsedAge < 18) {
        res.status(400).json({ success: false, message: 'You must be 18 or older to register as a donor' });
        return;
      }
    }

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      res.status(400).json({ success: false, message: 'Name must be at least 2 characters' });
      return;
    }
    if (!city || typeof city !== 'string' || city.trim().length < 2) {
      res.status(400).json({ success: false, message: 'City is required (at least 2 characters)' });
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
      city: city.trim(),
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

/**
 * POST /api/auth/google
 * Real Google OAuth Sign-In endpoint.
 * Validates Google ID token or Access token with Google OAuth2 APIs and authenticates or creates the donor account.
 */
export const googleAuth = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token: idToken, credential, accessToken, access_token } = req.body ?? {};
    const rawIdToken = (idToken || credential) as string | undefined;
    const rawAccessToken = (accessToken || access_token) as string | undefined;

    let targetEmail = '';
    let targetName = '';

    if (rawIdToken && typeof rawIdToken === 'string') {
      // Validate Google ID token directly with Google OAuth2 tokeninfo endpoint
      const googleRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(rawIdToken)}`);
      if (!googleRes.ok) {
        res.status(401).json({
          success: false,
          message: 'Invalid or expired Google credential token'
        });
        return;
      }

      const googleData = (await googleRes.json()) as {
        email?: string;
        name?: string;
        aud?: string;
        email_verified?: string | boolean;
      };

      if (!googleData.email) {
        res.status(400).json({
          success: false,
          message: 'Google credential does not contain an email address'
        });
        return;
      }

      if (config.google.clientId && googleData.aud && googleData.aud !== config.google.clientId) {
        res.status(401).json({
          success: false,
          message: 'Google Client ID mismatch'
        });
        return;
      }

      targetEmail = googleData.email.toLowerCase().trim();
      targetName = googleData.name?.trim() || targetEmail.split('@')[0];
    } else if (rawAccessToken && typeof rawAccessToken === 'string') {
      // Validate Google OAuth2 Access Token with Google userinfo endpoint
      const googleRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${rawAccessToken}` }
      });
      if (!googleRes.ok) {
        res.status(401).json({
          success: false,
          message: 'Invalid or expired Google access token'
        });
        return;
      }

      const googleData = (await googleRes.json()) as {
        email?: string;
        name?: string;
        email_verified?: boolean;
      };

      if (!googleData.email) {
        res.status(400).json({
          success: false,
          message: 'Google account does not contain a verified email'
        });
        return;
      }

      targetEmail = googleData.email.toLowerCase().trim();
      targetName = googleData.name?.trim() || targetEmail.split('@')[0];
    } else {
      res.status(400).json({
        success: false,
        message: 'Valid Google credential token is required'
      });
      return;
    }

    if (!targetEmail) {
      res.status(400).json({
        success: false,
        message: 'A valid email from Google is required'
      });
      return;
    }

    let user = await findUserByEmail(targetEmail);
    if (!user) {
      const randomPassword = await bcrypt.hash(Math.random().toString(36), 10);
      user = await createUser({
        name: targetName || 'Google Donor',
        email: targetEmail,
        passwordHash: randomPassword,
        role: 'donor'
      });
    }

    const token = signToken({ userId: user.id, role: user.role });

    res.status(200).json({
      success: true,
      message: 'Google authentication successful',
      data: { user: toPublicUser(user), token }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, message: 'Google authentication failed', error: message });
  }
};

