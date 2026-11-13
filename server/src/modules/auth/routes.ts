import { Router } from 'express';
import { body, param } from 'express-validator';
import { authenticate } from '../../middleware/auth.js';
import { validate } from '../../middleware/validation.js';
import { asyncHandler } from '../../middleware/error.js';
import { db } from '../../db/index.js';
import { config } from '../../config.js';
import { logger } from '../../logger.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import type { SignOptions } from 'jsonwebtoken';

const router = Router();

function issueToken(user: { id: string; email?: string; role: string }): string {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    config.jwtAccessSecret as string,
    { expiresIn: config.jwtAccessTtl } as SignOptions
  );
}

function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

function comparePassword(plain: string, hash: string): boolean {
  return bcrypt.compareSync(plain, hash);
}

/** POST /auth/register */
router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }),
    body('role').optional().isIn(['customer', 'provider']),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { email, password, role = 'customer' } = req.body;

    const existing = await db().query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      res.status(409).json({ error: 'conflict', message: 'Email already registered' });
      return;
    }

    const id = uuidv4();
    const passwordHash = hashPassword(password);
    await db().query(
      'INSERT INTO users (id, email, password_hash, role, is_active) VALUES ($1, $2, $3, $4, true) RETURNING id, email, role',
      [id, email, passwordHash, role]
    );

    const token = issueToken({ id, email, role });
    logger.info({ userId: id, email, role }, 'User registered');

    res.status(201).json({
      user: { id, email, role },
      token,
    });
  })
);

/** POST /auth/login */
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isString().notEmpty(),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const result = await db().query(
      'SELECT id, email, password_hash, role, is_active FROM users WHERE email = $1',
      [email]
    );
    const user = result.rows[0];
    if (!user || !comparePassword(password, user.password_hash)) {
      res.status(401).json({ error: 'unauthorized', message: 'Invalid credentials' });
      return;
    }
    if (user.is_active === false) {
      res.status(403).json({ error: 'forbidden', message: 'Account deactivated' });
      return;
    }

    const token = issueToken({ id: user.id, email: user.email, role: user.role });
    res.json({
      user: { id: user.id, email: user.email, role: user.role },
      token,
    });
  })
);

/** POST /auth/logout */
router.post('/logout', authenticate, asyncHandler(async (_req, res) => {
  // In a real implementation, revoke the session token here.
  res.json({ message: 'Logged out' });
}));

/** GET /me */
router.get('/me', authenticate, asyncHandler(async (req, res) => {
  const result = await db().query(
    'SELECT id, email, role, is_active, email_verified, phone_verified, language FROM users WHERE id = $1',
    [req.user!.id]
  );
  const user = result.rows[0];
  if (!user) {
    res.status(404).json({ error: 'not_found', message: 'User not found' });
    return;
  }
  res.json({ user });
}));

export default router;
