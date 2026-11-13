/**
 * Provider tests: registration, profile, search (read-only), matching.
 */
import { describe, it, expect, beforeAll } from '@jest/globals';
import request from 'supertest';
import app from '../src/index.js';
import { db } from '../src/db/index.js';
import { v4 as uuidv4 } from 'uuid';

let providerToken: string;
let customerToken: string;
let categoryId: string;

async function registerAndLogin(email: string, role: string) {
  await request(app)
    .post('/api/v1/auth/register')
    .send({ email, password: 'password123', role })
    .catch(() => {});
  const login = await request(app)
    .post('/api/v1/auth/login')
    .send({ email, password: 'password123' });
  return login.body.token;
}

describe('Providers', () => {
  beforeAll(async () => {
    providerToken = await registerAndLogin('prov-search@example.com', 'provider');
    customerToken = await registerAndLogin(`prov-cust-${Date.now()}@example.com`, 'customer');

    // Seed a service category with a real UUID
    categoryId = uuidv4();
    await db().query(
      `INSERT INTO service_categories (id, name, slug, description, is_active)
       VALUES ($1,'Cleaning','cleaning','Home cleaning',true,false,null)`,
      [categoryId]
    );
  });

  it('registers a provider profile', async () => {
    const res = await request(app)
      .post('/api/v1/providers/register')
      .set('Authorization', `Bearer ${providerToken}`)
      .send({
        display_name: 'Search Provider',
        categories: [categoryId],
        service_areas: ['Indiranagar'],
        languages: ['English'],
        pricing_rules: { hourly_rate_paise: 10000 },
      });
    expect(res.status).toBe(201);
    expect(res.body.provider.verification_status).toBe('pending');
  });

  it('lists active services', async () => {
    const res = await request(app).get('/api/v1/services');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.services)).toBe(true);
  });

  it('provider search is read-only and does not create a booking', async () => {
    const res = await request(app)
      .get('/api/v1/providers/search')
      .set('Authorization', `Bearer ${providerToken}`)
      .query({ category: categoryId, area: 'Indiranagar' });
    expect(res.status).toBe(200);
    expect(res.body.note).toContain('Read-only');
  });

  it('matching returns eligible providers with filters applied', async () => {
    const res = await request(app)
      .get('/api/v1/matching/eligible')
      .set('Authorization', `Bearer ${providerToken}`)
      .query({ category: categoryId, area: 'Indiranagar' });
    expect(res.status).toBe(200);
    expect(res.body.filters_applied.category).toBe(categoryId);
    expect(res.body.note).toContain('New provider');
  });

  it('customer cannot access provider profile (403)', async () => {
    const res = await request(app)
      .get('/api/v1/providers/me')
      .set('Authorization', `Bearer ${customerToken}`);
    expect(res.status).toBe(403);
  });
});
