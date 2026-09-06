import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtPayload } from '../utils/jwt';

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

/**
 * Verifies the `Authorization: Bearer <token>` header and attaches
 * the decoded payload to `req.user`. Responds 401 if missing/invalid.
 */
export const authenticate = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: 'Authentication required' });
    return;
  }

  const token = header.slice('Bearer '.length);

  try {
    req.user = verifyToken(token);
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

/**
 * Role-based authorization middleware.
 * Ensures the authenticated user has one of the allowed roles.
 */
export const requireRole = (...roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: `Access denied. Requires one of the following roles: ${roles.join(', ')}`
      });
      return;
    }

    next();
  };
};

/**
 * Middleware ensuring the authenticated user is a donor (or admin).
 */
export const requireDonor = requireRole('donor', 'admin');

/**
 * Middleware ensuring the authenticated user is a blood bank (or admin).
 */
export const requireBloodBank = requireRole('blood_bank', 'admin');

/**
 * Middleware ensuring the authenticated user is a hospital (or admin).
 */
export const requireHospital = requireRole('hospital', 'admin');


