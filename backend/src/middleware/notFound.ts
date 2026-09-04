import { Request, Response, NextFunction } from 'express';

/**
 * 404 Not Found Middleware
 * Handles requests to undefined routes
 */
export const notFoundHandler = (req: Request, res: Response, _next: NextFunction): void => {
  res.status(404).json({
    success: false,
    message: `Resource not found: ${req.method} ${req.originalUrl}`
  });
};
