/**
 * Auth tests: registration, login, /me, unauthorized access.
 */
import { describe, it, expect, beforeAll } from '@jest/globals';
import request from 'supertest';
import app from '../src/index.js';

let customerToken: string;

describe('Authentication', () => {
  beforeAll(async () => {
    // Register a customer
    const reg = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'alice@example.com', password: 'password123', role: 'customer' });
    expect(reg.status).toBe(201);

    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'alice@example.com', password: 'password123' });
    expect(login.status).toBe(200);
    customerToken = login.body.token;
  });

  it('registers a new customer', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'bob@example.com', password: 'password123', role: 'customer' });
    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe('bob@example.com');
  });

  it('rejects duplicate registration', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'alice@example.com', password: 'password123' });
    expect(res.status).toBe(409);
  });

  it('rejects invalid credentials', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'alice@example.com', password: 'wrong' });
    expect(res.status).toBe(401);
  });

  it('returns /me for authenticated user', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${customerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('alice@example.com');
  });

  it('rejects unauthenticated access to /me', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });

  it('rejects short password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'short@example.com', password: '123', role: 'customer' });
    expect(res.status).toBe(400);
  });
});
