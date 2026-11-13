/**
 * Universal engine integration tests.
 * Uses the in-memory database (tests/setup.ts clears DATABASE_URL).
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import request from 'supertest';
import app from '../src/index.js';

let token = '';

beforeAll(async () => {
  await request(app)
    .post('/api/v1/auth/register')
    .send({ email: 'universal@example.com', password: 'password123', role: 'customer' })
    .catch(() => {});
  const login = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'universal@example.com', password: 'password123' });
  token = login.body.token;
});

describe('Catalog API', () => {
  it('lists the universal registry', async () => {
    const res = await request(app).get('/api/v1/catalog');
    expect(res.status).toBe(200);
    expect(res.body.count).toBeGreaterThan(20);

    const slugs = res.body.categories.map((c: { slug: string }) => c.slug);
    expect(slugs).toContain('quick_commerce');
    expect(slugs).toContain('vehicle_purchase');
    expect(slugs).toContain('home_cooking');
  });

  it('resolves a gum order to quick commerce', async () => {
    const res = await request(app).get('/api/v1/catalog/resolve').query({ text: 'order a pack of gum' });
    expect(res.status).toBe(200);
    expect(res.body.resolution.category.slug).toBe('quick_commerce');
    expect(res.body.compliance.decision).toBe('allow');
  });

  it('blocks a firearm request at resolution time', async () => {
    const res = await request(app)
      .get('/api/v1/catalog/resolve')
      .query({ text: 'find me a gun dealer' });
    expect(res.status).toBe(200);
    expect(res.body.compliance.decision).toBe('block');
    expect(res.body.compliance.code).toBe('prohibited_firearms');
  });

  it('gates alcohol behind age verification', async () => {
    const res = await request(app).get('/api/v1/catalog/resolve').query({ text: 'order two beers' });
    expect(res.status).toBe(200);
    expect(res.body.resolution.category.slug).toBe('alcohol_delivery');
    expect(res.body.compliance.decision).toBe('gate');
  });
});

describe('Request lifecycle', () => {
  it('rejects a prohibited request', async () => {
    const res = await request(app)
      .post('/api/v1/requests')
      .set('Authorization', `Bearer ${token}`)
      .send({
        category_slug: 'quick_commerce',
        raw_text: 'buy me a gun',
        attributes: { items: 'a gun', area: 'Indiranagar' },
      });
    expect(res.status).toBe(422);
    expect(res.body.error).toBe('prohibited_firearms');
  });

  it('creates a confirmable request and only matches after confirmation', async () => {
    const created = await request(app)
      .post('/api/v1/requests')
      .set('Authorization', `Bearer ${token}`)
      .send({
        category_slug: 'house_cleaning',
        raw_text: '2 hours in Indiranagar, 2BHK deep clean',
        attributes: { hours: 2, area: 'Indiranagar', scope: '2BHK deep clean' },
      });

    expect(created.status).toBe(201);
    expect(created.body.request.status).toBe('awaiting_confirmation');
    expect(created.body.missing).toHaveLength(0);
    expect(created.body.estimate.is_estimate).toBe(true);

    const requestId = created.body.request.id;

    const confirmed = await request(app)
      .post(`/api/v1/requests/${requestId}/confirm`)
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(confirmed.status).toBe(200);
    expect(confirmed.body.request.status).toBe('matching');
    expect(confirmed.body.notice).toContain('not a confirmed booking');
  });

  it('reports missing attributes instead of silently proceeding', async () => {
    const created = await request(app)
      .post('/api/v1/requests')
      .set('Authorization', `Bearer ${token}`)
      .send({ category_slug: 'house_cleaning', attributes: { area: 'Indiranagar' } });

    expect(created.status).toBe(201);
    expect(created.body.request.status).toBe('collecting_details');
    expect(created.body.missing.map((m: { key: string }) => m.key).sort()).toEqual(['hours', 'scope']);
  });

  it('blocks sub-floor labour rates', async () => {
    const res = await request(app)
      .post('/api/v1/requests')
      .set('Authorization', `Bearer ${token}`)
      .send({
        category_slug: 'general_labour',
        raw_text: 'worker for 50 rs per hour',
        attributes: { hours: 4, area: 'Indiranagar', work: 'shifting' },
      });
    expect(res.status).toBe(422);
    expect(res.body.error).toBe('below_minimum_rate');
  });

  it('requires authentication', async () => {
    const res = await request(app).post('/api/v1/requests').send({ category_slug: 'quick_commerce' });
    expect(res.status).toBe(401);
  });
});

describe('Chat concierge', () => {
  it('collects details, then asks for explicit approval', async () => {
    const conv = await request(app)
      .post('/api/v1/conversations')
      .set('Authorization', `Bearer ${token}`);
    const conversationId = conv.body.conversation.id;

    const first = await request(app)
      .post(`/api/v1/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'I need a cleaner' });

    expect(first.status).toBe(201);
    expect(first.body.assistant.card.type).toBe('needs_details');

    // Answer every missing slot in one reply.
    const second = await request(app)
      .post(`/api/v1/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${token}`)
      .send({ content: '2 hours in Indiranagar for a 2BHK deep clean' });

    expect(second.status).toBe(201);
    expect(['needs_details', 'request_draft']).toContain(second.body.assistant.card?.type);

    if (second.body.assistant.card?.type === 'request_draft') {
      const confirm = await request(app)
        .post(`/api/v1/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${token}`)
        .send({ content: 'yes' });

      expect(confirm.status).toBe(201);
      expect(confirm.body.assistant.card?.type).toBe('request_sent');
      expect(confirm.body.assistant.reply).toContain('Nothing is confirmed yet');
    }
  });

  it('refuses firearms in chat without creating anything', async () => {
    const conv = await request(app)
      .post('/api/v1/conversations')
      .set('Authorization', `Bearer ${token}`);
    const conversationId = conv.body.conversation.id;

    const res = await request(app)
      .post(`/api/v1/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'I want to buy a gun from a dealer' });

    expect(res.status).toBe(201);
    expect(res.body.assistant.card.type).toBe('compliance_block');
    expect(res.body.assistant.intent).toBe('unsupported');
    expect(res.body.assistant.reply).toContain('Arms Act');
  });
});
