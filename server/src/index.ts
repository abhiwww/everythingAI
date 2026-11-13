import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config, isDemoMode } from './config.js';
import { logger } from './logger.js';
import { errorHandler, notFound, asyncHandler } from './middleware/error.js';
import { requestId } from './middleware/request-id.js';
import { rateLimit } from './middleware/rate-limit.js';
import authRoutes from './modules/auth/routes.js';
import chatRoutes from './modules/chat/routes.js';
import catalogueRoutes from './modules/catalogue/routes.js';
import providerRoutes from './modules/providers/routes.js';
import matchingRoutes from './modules/matching/routes.js';
import quoteRoutes from './modules/quotes/routes.js';
import bookingRoutes from './modules/bookings/routes.js';
import supportRoutes from './modules/support/routes.js';
import adminRoutes from './modules/admin/routes.js';
import catalogRoutes from './modules/catalog/routes.js';
import requestRoutes from './modules/requests/routes.js';
import orderRoutes from './modules/orders/routes.js';
import { db } from './db/index.js';

const app = express();

// Trust proxy (for accurate client IPs behind load balancers)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());
app.use(cors({ origin: config.webBaseUrl, credentials: true }));
app.use(express.json({ limit: '1mb' }));

// Rate limiting on auth and chat endpoints
app.use('/api/v1/auth/', rateLimit({ windowMs: 60 * 1000, max: 30 }));
app.use('/api/v1/conversations/', rateLimit({ windowMs: 60 * 1000, max: 60 }));
app.use('/api/v1/requests/', rateLimit({ windowMs: 60 * 1000, max: 60 }));
app.use('/api/v1/catalog/', rateLimit({ windowMs: 60 * 1000, max: 120 }));

// Request ID + logging
app.use(requestId);
app.use((req: Request, _res: Response, next: NextFunction) => {
  logger.debug({ method: req.method, path: req.path, requestId: (req as any).requestId }, 'Incoming request');
  next();
});

// Health check
app.get('/health', asyncHandler(async (_req: Request, res: Response) => {
  const dbOk = await checkDatabase();
  res.json({
    status: dbOk ? 'ok' : 'degraded',
    service: 'everyday-ai-server',
    version: '1.0.0-mvp',
    environment: config.nodeEnv,
    demo_mode: isDemoMode(),
    ai_enabled: config.aiEnabled,
    payments_enabled: config.featurePayments,
    timestamp: new Date().toISOString(),
    checks: {
      database: dbOk ? 'connected' : 'in_memory_demo',
    },
  });
}));

async function checkDatabase(): Promise<boolean> {
  try {
    await db().query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}

// API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/conversations', chatRoutes);
app.use('/api/v1/services', catalogueRoutes);
app.use('/api/v1/providers', providerRoutes);
app.use('/api/v1/matching', matchingRoutes);
app.use('/api/v1/quotes', quoteRoutes);
app.use('/api/v1/bookings', bookingRoutes);
app.use('/api/v1/support', supportRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/catalog', catalogRoutes);
app.use('/api/v1/requests', requestRoutes);
app.use('/api/v1/orders', orderRoutes);

// 404
app.use(notFound);

// Error handler (must be last)
app.use(errorHandler);

let server: any = null;

if (process.env.NODE_ENV !== 'test') {
  server = app.listen(config.port, () => {
    logger.info({
      port: config.port,
      env: config.nodeEnv,
      demo_mode: isDemoMode(),
    }, 'Everyday AI Concierge server started');
  });
}

export { server };
export default app;

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received — shutting down');
  server?.close(() => process.exit(0));
});
process.on('SIGINT', () => {
  logger.info('SIGINT received — shutting down');
  server?.close(() => process.exit(0));
});
