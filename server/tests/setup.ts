/**
 * Test setup.
 * Forces in-memory database mode (no PostgreSQL required) and disables AI.
 */

process.env.DATABASE_URL = '';
process.env.AI_ENABLED = 'false';
process.env.JWT_ACCESS_SECRET = 'test-access-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.NODE_ENV = 'test';

import '../src/db/index';
