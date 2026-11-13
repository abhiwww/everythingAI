/**
 * AI guardrail tests:
 * - AI disabled uses deterministic stub, labelled demo mode
 * - AI cannot trigger consequential actions without approval
 * - Unsupported categories disclosed honestly
 */
import { describe, it, expect } from '@jest/globals';
import request from 'supertest';
import app from '../src/index.js';

let customerToken: string;

beforeAll(async () => {
  await request(app)
    .post('/api/v1/auth/register')
    .send({ email: 'ai-cust@example.com', password: 'password123', role: 'customer' })
    .catch(() => {});
  const login = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'ai-cust@example.com', password: 'password123' });
  customerToken = login.body.token;
});

describe('AI orchestration guardrails', () => {
  it('chat returns a response in demo mode, labelled as demo', async () => {
    const res = await request(app)
      .post('/api/v1/conversations')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ title: 'AI test' });
    expect(res.status).toBe(201);
    const conversationId = res.body.conversation.id;

    const msg = await request(app)
      .post(`/api/v1/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ content: 'I need my bathroom cleaned today' });
    expect(msg.status).toBe(201);
    expect(msg.body.assistant.demo_mode).toBe(true);
    expect(msg.body.assistant.warning).toContain('Demo mode');
    expect(msg.body.assistant.intent).toBe('local_service');
  });

  it('unsupported category is honestly disclosed', async () => {
    const convRes = await request(app)
      .post('/api/v1/conversations')
      .set('Authorization', `Bearer ${customerToken}`);
    const conversationId = convRes.body.conversation.id;

    const msg = await request(app)
      .post(`/api/v1/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ content: 'I want a bodyguard for my house' });
    expect(msg.status).toBe(201);
    expect(msg.body.assistant.intent).toBe('unsupported');
    expect(msg.body.assistant.reply).toMatch(/not enabled|PSARA|licence/i);
    expect(msg.body.assistant.card?.type).toBe('compliance_block');
  });

  it('planning-only trip is labelled as suggestion', async () => {
    const convRes = await request(app)
      .post('/api/v1/conversations')
      .set('Authorization', `Bearer ${customerToken}`);
    const conversationId = convRes.body.conversation.id;

    const msg = await request(app)
      .post(`/api/v1/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ content: 'Plan a five-day trip from Bengaluru to Kerala' });
    expect(msg.status).toBe(201);
    expect(msg.body.assistant.intent).toBe('planning');
    expect(msg.body.assistant.reply).toContain('suggestion');
  });

  it('AI does not expose payment/ordering endpoints (future consequential, disabled)', async () => {
    // There is no /api/v1/payments or /api/v1/orders route in the MVP.
    const res = await request(app).post('/api/v1/payments/charge');
    expect(res.status).toBe(404);
  });
});
