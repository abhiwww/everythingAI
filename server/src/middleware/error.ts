import { Request, Response, NextFunction, RequestHandler } from 'express';
import { logger } from '../logger.js';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = err.statusCode ?? 500;
  const isOperational = err.isOperational ?? false;

  logger.error({ err, statusCode, isOperational }, 'Request error');

  if (!isOperational && process.env.NODE_ENV === 'production') {
    // Don't leak unexpected error details in production
    res.status(500).json({
      error: 'internal_server_error',
      message: 'An unexpected error occurred',
    });
    return;
  }

  res.status(statusCode).json({
    error: err.name || 'error',
    message: err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
}

export function notFound(_req: Request, res: Response): void {
  res.status(404).json({ error: 'not_found', message: 'Route not found' });
}

export function asyncHandler(fn: RequestHandler) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
