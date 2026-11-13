/**
 * Simple in-memory rate limiter.
 * Production should use Redis-backed rate limiting (e.g., express-rate-limit + RedisStore).
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../logger.js';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

function getWindowKey(windowMs: number): number {
  return Math.floor(Date.now() / windowMs);
}

export function rateLimit(options: {
  windowMs?: number;
  max?: number;
  message?: string;
}) {
  const windowMs = options.windowMs ?? 60 * 1000; // 1 minute
  const max = options.max ?? 60; // 60 requests per window
  const message = options.message ?? 'Too many requests, please try again later';

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = (req as any).requestId ?? req.ip ?? 'unknown';
    const window = getWindowKey(windowMs);
    const storeKey = `${key}:${window}`;

    let entry = store.get(storeKey);
    if (!entry || entry.resetAt < Date.now()) {
      entry = { count: 0, resetAt: Date.now() + windowMs };
      store.set(storeKey, entry);
    }

    entry.count++;

    if (entry.count > max) {
      logger.warn({ key, window }, 'Rate limit exceeded');
      res.status(429).json({
        error: 'rate_limited',
        message,
        retry_after: Math.ceil((entry.resetAt - Date.now()) / 1000),
      });
      return;
    }

    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, max - entry.count)));
    res.setHeader('X-RateLimit-Reset', String(entry.resetAt));
    next();
  };
}

/** Cleanup old entries periodically to prevent memory growth */
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [k, v] of store.entries()) {
    if (v.resetAt < now) store.delete(k);
  }
}, 5 * 60 * 1000);

if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
  cleanupInterval.unref();
}
