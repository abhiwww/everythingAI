import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';

export function validate(req: Request, res: Response, next: NextFunction): void {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      error: 'validation_error',
      message: 'Invalid request parameters',
      details: errors.array().map((e) => ({
        field: 'param' in e ? (e.param as string) : 'unknown',
        message: typeof e.msg === 'string' ? e.msg : 'invalid',
      })),
    });
    return;
  }
  next();
}
