/**
 * Universal request service.
 *
 * Shared by the HTTP routes and the chat orchestrator so there is exactly one
 * implementation of "create a request / confirm it / accept an offer".
 */

import { v4 as uuidv4 } from 'uuid';
import { db } from '../../db/index.js';
import { getCategory, type CategoryDefinition } from '../../domain/taxonomy.js';
import {
  checkCompliance,
  checkProviderEligibility,
  type ComplianceDecision,
} from '../../domain/compliance.js';
import {
  canOrderTransition,
  estimatePrice,
  missingAttributes,
  summariseRequest,
  validateAttributes,
  type AttributeIssue,
  type OrderStatus,
  type PriceEstimate,
  type RequestStatus,
} from '../../domain/request-flow.js';
import { logger } from '../../logger.js';

export interface RequestRow {
  id: string;
  customer_id: string;
  conversation_id?: string | null;
  category_slug: string;
  raw_text?: string | null;
  attributes: Record<string, unknown>;
  city: string;
  status: RequestStatus;
  compliance?: unknown;
  price_estimate?: unknown;
  summary?: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderRow {
  id: string;
  request_id: string;
  offer_id?: string | null;
  customer_id: string;
  provider_id: string;
  category_slug: string;
  status: OrderStatus;
  total: string | number;
  currency: string;
  attributes: Record<string, unknown>;
  created_at: string;
}

interface Outcome<T> {
  ok: boolean;
  httpStatus: number;
  code?: string;
  message?: string;
  data?: T;
}

function deny<T>(httpStatus: number, code: string, message: string): Outcome<T> {
  return { ok: false, httpStatus, code, message };
}

const UNKNOWN_CATEGORY: ComplianceDecision = {
  decision: 'block',
  code: 'unknown_category',
  message: "I don't have a category for that yet.",
  required_actions: [],
  provider_requirements: [],
  matched: [],
};

function parseJson<T>(value: unknown, fallback: T): T {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return (value as T) ?? fallback;
}

/** The in-memory dev store returns JSONB as strings; normalise both backends. */
function normaliseRequest(row: RequestRow | undefined | null): RequestRow | null {
  if (!row) return null;
  return {
    ...row,
    attributes: parseJson<Record<string, unknown>>(row.attributes, {}),
  };
}

function normaliseOrder(row: OrderRow | undefined | null): OrderRow | null {
  if (!row) return null;
  return {
    ...row,
    attributes: parseJson<Record<string, unknown>>(row.attributes, {}),
  };
}

async function audit(
  subjectType: 'request' | 'provider' | 'message',
  subjectId: string | null,
  categorySlug: string | null,
  decision: ComplianceDecision
): Promise<void> {
  try {
    await db().query(
      `INSERT INTO compliance_checks (id, subject_type, subject_id, category_slug, decision, code, detail)
       VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb)`,
      [uuidv4(), subjectType, subjectId, categorySlug, decision.decision, decision.code, JSON.stringify(decision)]
    );
  } catch (err) {
    logger.warn({ err }, 'Could not write compliance audit row');
  }
}

export interface CreateRequestInput {
  customerId: string;
  categorySlug: string;
  rawText?: string;
  attributes?: Record<string, unknown>;
  conversationId?: string;
  city?: string;
  customer?: { ageVerified?: boolean; dateOfBirth?: string };
}

export interface CreateRequestData {
  request?: RequestRow;
  compliance: ComplianceDecision;
  missing: AttributeIssue[];
  estimate: PriceEstimate | null;
  summary: string;
  category: ReturnType<typeof describeCategory>;
}

function describeCategory(category: CategoryDefinition) {
  return {
    slug: category.slug,
    name: category.name,
    vertical: category.vertical,
    provider_role: category.providerRole,
    fulfillment: category.fulfillment,
    transactable: category.transactable,
  };
}

export async function createRequest(
  input: CreateRequestInput
): Promise<Outcome<CreateRequestData>> {
  const category = getCategory(input.categorySlug);
  if (!category) {
    return deny(404, 'unknown_category', `Unknown category: ${input.categorySlug}`);
  }

  const attributes = input.attributes ?? {};
  const city = input.city ?? 'Bengaluru';
  const validation = validateAttributes(category, attributes, { requireAll: false });
  if (!validation.ok) {
    return {
      ok: false,
      httpStatus: 400,
      code: 'invalid_attributes',
      message: validation.errors.join('; '),
    };
  }

  const compliance = checkCompliance({
    text: input.rawText,
    category,
    attributes,
    customer: input.customer,
    city,
  });

  const missing = missingAttributes(category, attributes);
  const estimate = estimatePrice(category, attributes);
  const summary = summariseRequest(category, attributes);

  if (compliance.decision === 'block') {
    await audit('request', null, category.slug, compliance);
    return {
      ok: false,
      httpStatus: 422,
      code: compliance.code,
      message: compliance.message,
      data: { compliance, missing, estimate, summary, category: describeCategory(category) },
    };
  }

  // Gated categories are not persisted until the gate is cleared — the
  // concierge presents the required action instead of pretending to proceed.
  if (compliance.decision === 'gate') {
    await audit('request', null, category.slug, compliance);
    return {
      ok: false,
      httpStatus: 409,
      code: compliance.code,
      message: compliance.message,
      data: { compliance, missing, estimate, summary, category: describeCategory(category) },
    };
  }

  const id = uuidv4();
  const status: RequestStatus = missing.length === 0 ? 'awaiting_confirmation' : 'collecting_details';

  try {
    const result = await db().query(
      `INSERT INTO requests
        (id, customer_id, conversation_id, category_slug, raw_text, attributes, city, status, compliance, price_estimate, summary)
       VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9::jsonb,$10::jsonb,$11)
       RETURNING *`,
      [
        id,
        input.customerId,
        input.conversationId ?? null,
        category.slug,
        input.rawText ?? null,
        JSON.stringify(attributes),
        city,
        status,
        JSON.stringify(compliance),
        JSON.stringify(estimate),
        summary,
      ]
    );

    await audit('request', id, category.slug, compliance);

    return {
      ok: true,
      httpStatus: 201,
      data: {
        request: normaliseRequest(result.rows[0] as RequestRow) ?? (result.rows[0] as RequestRow),
        compliance,
        missing,
        estimate,
        summary,
        category: describeCategory(category),
      },
    };
  } catch (err) {
    logger.error({ err }, 'Failed to create request');
    return deny(500, 'request_create_failed', 'Could not create the request');
  }
}

export async function getRequestRow(requestId: string): Promise<RequestRow | null> {
  const result = await db().query('SELECT * FROM requests WHERE id = $1', [requestId]);
  return normaliseRequest(result.rows[0] as RequestRow);
}

export async function listRequests(customerId: string): Promise<RequestRow[]> {
  const result = await db().query(
    'SELECT * FROM requests WHERE customer_id = $1 ORDER BY created_at DESC LIMIT 50',
    [customerId]
  );
  return (result.rows as RequestRow[]).map((r) => normaliseRequest(r)!).filter(Boolean);
}

export async function confirmRequest(
  customerId: string,
  requestId: string
): Promise<Outcome<{ request: RequestRow; compliance: ComplianceDecision }>> {
  const row = await getRequestRow(requestId);
  if (!row) return deny(404, 'not_found', 'Request not found');
  if (row.customer_id !== customerId) return deny(403, 'forbidden', 'You do not own this request');

  const category = getCategory(row.category_slug);
  if (!category) return deny(409, 'unknown_category', 'This category no longer exists');

  const attributes = row.attributes ?? {};
  const compliance = checkCompliance({
    text: row.raw_text ?? undefined,
    category,
    attributes,
    city: row.city,
  });

  if (compliance.decision !== 'allow') {
    await audit('request', row.id, category.slug, compliance);
    return {
      ok: false,
      httpStatus: compliance.decision === 'block' ? 422 : 409,
      code: compliance.code,
      message: compliance.message,
    };
  }

  const missing = missingAttributes(category, attributes);
  if (missing.length > 0) {
    return {
      ok: false,
      httpStatus: 409,
      code: 'missing_attributes',
      message: `Still missing: ${missing.map((m) => m.label).join(', ')}`,
    };
  }

  if (row.status !== 'awaiting_confirmation' && row.status !== 'collecting_details') {
    return deny(409, 'invalid_state', `Request is ${row.status}, not awaiting confirmation`);
  }

  const result = await db().query(
    'UPDATE requests SET status = $1, updated_at = now() WHERE id = $2 RETURNING *',
    ['matching', requestId]
  );

  await audit('request', row.id, category.slug, compliance);

  return {
    ok: true,
    httpStatus: 200,
    data: { request: normaliseRequest(result.rows[0] as RequestRow)!, compliance },
  };
}

export async function cancelRequest(
  customerId: string,
  requestId: string
): Promise<Outcome<{ request: RequestRow }>> {
  const row = await getRequestRow(requestId);
  if (!row) return deny(404, 'not_found', 'Request not found');
  if (row.customer_id !== customerId) return deny(403, 'forbidden', 'You do not own this request');
  if (row.status === 'completed' || row.status === 'cancelled') {
    return deny(409, 'invalid_state', `Request is already ${row.status}`);
  }

  const result = await db().query(
    'UPDATE requests SET status = $1, cancelled_at = now(), updated_at = now() WHERE id = $2 RETURNING *',
    ['cancelled', requestId]
  );
  return { ok: true, httpStatus: 200, data: { request: normaliseRequest(result.rows[0] as RequestRow)! } };
}

export async function createOffer(input: {
  providerUserId: string;
  requestId: string;
  price: number;
  etaMinutes?: number;
  message?: string;
}): Promise<Outcome<{ offer: Record<string, unknown> }>> {
  const providerResult = await db().query(
    'SELECT id, verification_status FROM provider_profiles WHERE user_id = $1',
    [input.providerUserId]
  );
  const provider = providerResult.rows[0];
  if (!provider) return deny(403, 'not_a_provider', 'No provider profile for this account');

  const request = await getRequestRow(input.requestId);
  if (!request) return deny(404, 'not_found', 'Request not found');
  if (request.status !== 'matching' && request.status !== 'quoted') {
    return deny(409, 'invalid_state', `Request is ${request.status}; offers are not open`);
  }

  const category = getCategory(request.category_slug);
  if (!category) return deny(409, 'unknown_category', 'Unknown category');

  const eligibility = checkProviderEligibility({
    category,
    provider: { verificationStatus: provider.verification_status },
  });
  if (eligibility.decision !== 'allow') {
    await audit('provider', String(provider.id), category.slug, eligibility);
    return { ok: false, httpStatus: 403, code: eligibility.code, message: eligibility.message };
  }

  const id = uuidv4();
  const result = await db().query(
    `INSERT INTO request_offers (id, request_id, provider_id, price, eta_minutes, message, status)
     VALUES ($1,$2,$3,$4,$5,$6,'offered') RETURNING *`,
    [id, input.requestId, provider.id, input.price, input.etaMinutes ?? null, input.message ?? null]
  );

  await db().query('UPDATE requests SET status = $1, updated_at = now() WHERE id = $2', [
    'quoted',
    input.requestId,
  ]);

  return { ok: true, httpStatus: 201, data: { offer: result.rows[0] } };
}

export async function listOffers(requestId: string): Promise<Record<string, unknown>[]> {
  const result = await db().query(
    'SELECT * FROM request_offers WHERE request_id = $1 ORDER BY created_at ASC LIMIT 50',
    [requestId]
  );
  return result.rows;
}

export async function acceptOffer(
  customerId: string,
  requestId: string,
  offerId: string
): Promise<Outcome<{ order: OrderRow }>> {
  const request = await getRequestRow(requestId);
  if (!request) return deny(404, 'not_found', 'Request not found');
  if (request.customer_id !== customerId) return deny(403, 'forbidden', 'You do not own this request');

  const offerResult = await db().query('SELECT * FROM request_offers WHERE id = $1', [offerId]);
  const offer = offerResult.rows[0] as
    | { id: string; request_id: string; provider_id: string; price: string; status: string }
    | undefined;
  if (!offer || offer.request_id !== requestId) return deny(404, 'not_found', 'Offer not found');
  if (offer.status !== 'offered') return deny(409, 'invalid_state', `Offer is ${offer.status}`);

  const providerResult = await db().query(
    'SELECT id, verification_status FROM provider_profiles WHERE id = $1',
    [offer.provider_id]
  );
  const provider = providerResult.rows[0];
  const category = getCategory(request.category_slug);
  if (!category) return deny(409, 'unknown_category', 'Unknown category');

  const eligibility = checkProviderEligibility({
    category,
    provider: { verificationStatus: provider?.verification_status },
  });
  if (eligibility.decision !== 'allow') {
    await audit('provider', String(offer.provider_id), category.slug, eligibility);
    return { ok: false, httpStatus: 403, code: eligibility.code, message: eligibility.message };
  }

  const orderId = uuidv4();
  const orderResult = await db().query(
    `INSERT INTO orders
      (id, request_id, offer_id, customer_id, provider_id, category_slug, status, total, currency, attributes)
     VALUES ($1,$2,$3,$4,$5,$6,'confirmed',$7,'INR',$8::jsonb)
     RETURNING *`,
    [
      orderId,
      requestId,
      offerId,
      customerId,
      offer.provider_id,
      category.slug,
      offer.price,
      JSON.stringify(request.attributes ?? {}),
    ]
  );

  await db().query('UPDATE request_offers SET status = $1 WHERE id = $2', ['accepted', offerId]);
  await db().query(
    'UPDATE requests SET status = $1, confirmed_at = now(), updated_at = now() WHERE id = $2',
    ['confirmed', requestId]
  );
  await db().query(
    `INSERT INTO order_events (id, order_id, from_status, to_status, actor_id, actor_role, reason)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [uuidv4(), orderId, null, 'confirmed', customerId, 'customer', 'Customer accepted provider offer']
  );

  return { ok: true, httpStatus: 201, data: { order: normaliseOrder(orderResult.rows[0] as OrderRow)! } };
}

export async function getOrderRow(orderId: string): Promise<OrderRow | null> {
  const result = await db().query('SELECT * FROM orders WHERE id = $1', [orderId]);
  return normaliseOrder(result.rows[0] as OrderRow);
}

export async function listOrders(customerId: string): Promise<OrderRow[]> {
  const result = await db().query(
    'SELECT * FROM orders WHERE customer_id = $1 ORDER BY created_at DESC LIMIT 50',
    [customerId]
  );
  return (result.rows as OrderRow[]).map((r) => normaliseOrder(r)!).filter(Boolean);
}

export async function advanceOrder(input: {
  actorId: string;
  actorRole: string;
  orderId: string;
  to: OrderStatus;
  reason?: string;
}): Promise<Outcome<{ order: OrderRow }>> {
  const order = await getOrderRow(input.orderId);
  if (!order) return deny(404, 'not_found', 'Order not found');

  const isStaff = input.actorRole === 'admin' || input.actorRole === 'support';
  if (!isStaff) {
    const providerResult = await db().query(
      'SELECT id FROM provider_profiles WHERE user_id = $1',
      [input.actorId]
    );
    const providerId = providerResult.rows[0]?.id;
    if (!providerId || providerId !== order.provider_id) {
      return deny(403, 'forbidden', 'Only the assigned provider can update this order');
    }
  }

  if (!canOrderTransition(order.status, input.to)) {
    return deny(409, 'invalid_transition', `Cannot move order from ${order.status} to ${input.to}`);
  }

  const result = await db().query(
    `UPDATE orders SET status = $1,
       completed_at = CASE WHEN $1 = 'completed' THEN now() ELSE completed_at END,
       cancelled_at = CASE WHEN $1 = 'cancelled' THEN now() ELSE cancelled_at END,
       updated_at = now()
     WHERE id = $2 RETURNING *`,
    [input.to, input.orderId]
  );

  await db().query(
    `INSERT INTO order_events (id, order_id, from_status, to_status, actor_id, actor_role, reason)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [uuidv4(), input.orderId, order.status, input.to, input.actorId, input.actorRole, input.reason ?? null]
  );

  if (input.to === 'in_progress') {
    await db().query('UPDATE requests SET status = $1 WHERE id = $2', ['fulfilling', order.request_id]);
  }
  if (input.to === 'completed') {
    await db().query('UPDATE requests SET status = $1, completed_at = now() WHERE id = $2', [
      'completed',
      order.request_id,
    ]);
  }

  return { ok: true, httpStatus: 200, data: { order: normaliseOrder(result.rows[0] as OrderRow)! } };
}
