import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { logger } from '../logger.js';
import { memoryDb, db } from '../db/index.js';
import { Role } from '../types/index.js';

export interface AuthenticatedRequest extends Request {
  user?: { id: string; email?: string; role: Role };
}

export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'unauthorized', message: 'Missing bearer token' });
    return;
  }

  const token = header.slice(7);
  try {
    const decoded = jwt.verify(token, config.jwtAccessSecret) as {
      sub: string;
      email?: string;
      role: Role;
    };
    req.user = { id: decoded.sub, email: decoded.email, role: decoded.role };
    next();
  } catch (err) {
    logger.warn({ err }, 'Invalid or expired token');
    res.status(401).json({ error: 'unauthorized', message: 'Invalid or expired token' });
  }
}

export function requireRole(...allowed: Role[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'unauthorized', message: 'Authentication required' });
      return;
    }
    if (!allowed.includes(req.user.role)) {
      res.status(403).json({ error: 'forbidden', message: 'Insufficient role' });
      return;
    }
    next();
  };
}

export async function requireOwnershipOrRole(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
  getOwnerId: () => Promise<string | null>,
  allowedRoles: Role[] = ['admin', 'support']
): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'unauthorized', message: 'Authentication required' });
    return;
  }
  if (allowedRoles.includes(req.user.role)) {
    next();
    return;
  }
  const ownerId = await getOwnerId();
  if (ownerId && ownerId === req.user.id) {
    next();
    return;
  }
  res.status(403).json({ error: 'forbidden', message: 'You do not own this resource' });
}
