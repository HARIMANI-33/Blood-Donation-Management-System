import { Request, Response } from 'express';
import { checkConnection } from '../config/database';

/**
 * Health check controller to verify server status
 * GET /api/health
 */
export const getHealth = (_req: Request, res: Response): void => {
  res.status(200).json({
    success: true,
    message: 'Blood Bank API is running'
  });
};

/**
 * Database health check controller
 * GET /api/health/db
 */
export const getDbHealth = async (_req: Request, res: Response): Promise<void> => {
  try {
    const isConnected = await checkConnection();

    if (isConnected) {
      res.status(200).json({
        success: true,
        message: 'PostgreSQL database connection is healthy'
      });
    } else {
      res.status(503).json({
        success: false,
        message: 'PostgreSQL database connection failed'
      });
    }
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(503).json({
      success: false,
      message: 'PostgreSQL database connection failed',
      error: errMessage
    });
  }
};
