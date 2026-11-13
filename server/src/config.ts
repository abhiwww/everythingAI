import dotenv from 'dotenv';
dotenv.config();

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optional(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

export const config = {
  nodeEnv: optional('NODE_ENV', 'development'),
  port: parseInt(optional('PORT', '4000'), 10),
  apiBaseUrl: optional('API_BASE_URL', 'http://localhost:4000'),
  webBaseUrl: optional('WEB_BASE_URL', 'http://localhost:3000'),

  jwtAccessSecret: optional('JWT_ACCESS_SECRET', 'dev-only-access-secret-change-me'),
  jwtRefreshSecret: optional('JWT_REFRESH_SECRET', 'dev-only-refresh-secret-change-me'),
  jwtAccessTtl: optional('JWT_ACCESS_TTL', '15m'),
  jwtRefreshTtl: optional('JWT_REFRESH_TTL', '7d'),

  databaseUrl: optional('DATABASE_URL', 'postgresql://everyday:everyday@localhost:5432/everyday_ai'),
  redisUrl: optional('REDIS_URL', 'redis://localhost:6379'),

  aiProvider: optional('AI_PROVIDER', 'stub'),
  aiApiKey: optional('AI_API_KEY', ''),
  aiModel: optional('AI_MODEL', 'gpt-4o-mini'),
  aiTemperature: parseFloat(optional('AI_TEMPERATURE', '0.2')),
  aiTimeoutMs: parseInt(optional('AI_TIMEOUT_MS', '10000'), 10),
  aiEnabled: optional('AI_ENABLED', 'false') === 'true',

  notificationProvider: optional('NOTIFICATION_PROVIDER', 'stub'),
  smtpHost: optional('SMTP_HOST', ''),
  smtpPort: optional('SMTP_PORT', ''),
  smtpUser: optional('SMTP_USER', ''),
  smtpPass: optional('SMTP_PASS', ''),

  storageProvider: optional('STORAGE_PROVIDER', 'local'),
  storageBucket: optional('STORAGE_BUCKET', ''),

  pilotCity: optional('PILOT_CITY', 'Bengaluru'),
  pilotAreas: optional('PILOT_AREAS', 'Indiranagar,Koramangala,HSR Layout,Whitefield').split(','),
  currency: optional('CURRENCY', 'INR'),
  timezone: optional('TIMEZONE', 'Asia/Kolkata'),

  featureCleaning: optional('FEATURE_CLEANING', 'true') === 'true',
  featureDriving: optional('FEATURE_DRIVING', 'true') === 'true',
  featureGardening: optional('FEATURE_GARDENING', 'true') === 'true',
  featurePayments: optional('FEATURE_PAYMENTS', 'false') === 'true',
  featureVoice: optional('FEATURE_VOICE', 'false') === 'false',
  featureTravel: optional('FEATURE_TRAVEL', 'true') === 'true',

  isDemo: optional('AI_ENABLED', 'false') !== 'true',
} as const;

export function isProduction(): boolean {
  return config.nodeEnv === 'production';
}

export function isDemoMode(): boolean {
  return config.isDemo;
}


