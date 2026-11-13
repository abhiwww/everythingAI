/**
 * Universal request/order state machine and chat slot-filling.
 *
 * One pipeline serves every vertical:
 *   draft → collecting_details → awaiting_confirmation → matching →
 *   quoted → confirmed → fulfilling → completed
 *
 * The important guarantee: nothing is ever reported as "booked" until the
 * backend has a provider acceptance (order.status = confirmed).
 */

import type { AttributeSpec, CategoryDefinition } from './taxonomy.js';

export type RequestStatus =
  | 'draft'
  | 'collecting_details'
  | 'awaiting_confirmation'
  | 'matching'
  | 'quoted'
  | 'confirmed'
  | 'fulfilling'
  | 'completed'
  | 'cancelled'
  | 'rejected'
  | 'expired';

export const REQUEST_TRANSITIONS: Record<RequestStatus, RequestStatus[]> = {
  draft: ['collecting_details', 'awaiting_confirmation', 'cancelled'],
  collecting_details: ['awaiting_confirmation', 'cancelled', 'expired'],
  awaiting_confirmation: ['collecting_details', 'matching', 'cancelled', 'expired'],
  matching: ['quoted', 'confirmed', 'cancelled', 'expired'],
  quoted: ['confirmed', 'cancelled', 'expired'],
  confirmed: ['fulfilling', 'cancelled'],
  fulfilling: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
  rejected: [],
  expired: [],
};

export function canTransition(from: RequestStatus, to: RequestStatus): boolean {
  return REQUEST_TRANSITIONS[from]?.includes(to) ?? false;
}

export type OrderStatus =
  | 'confirmed'
  | 'preparing'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'disputed';

export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  confirmed: ['preparing', 'in_progress', 'cancelled'],
  preparing: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled', 'disputed'],
  completed: ['disputed'],
  cancelled: [],
  disputed: ['completed', 'cancelled'],
};

export function canOrderTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_TRANSITIONS[from]?.includes(to) ?? false;
}

export interface AttributeIssue {
  key: string;
  label: string;
  type: AttributeSpec['type'];
  options?: string[];
}

export function missingAttributes(
  category: CategoryDefinition,
  attributes: Record<string, unknown>
): AttributeIssue[] {
  return category.requiredAttributes
    .filter((spec) => isBlank(attributes[spec.key]))
    .map((spec) => ({
      key: spec.key,
      label: spec.label,
      type: spec.type,
      options: spec.options,
    }));
}

export function validateAttributes(
  category: CategoryDefinition,
  attributes: Record<string, unknown>,
  options: { requireAll?: boolean } = {}
): { ok: boolean; errors: string[] } {
  const requireAll = options.requireAll ?? true;
  const errors: string[] = [];

  for (const spec of [...category.requiredAttributes, ...(category.optionalAttributes ?? [])]) {
    const value = attributes[spec.key];
    if (isBlank(value)) {
      if (spec.required && requireAll) errors.push(`${spec.label} is required`);
      continue;
    }
    if (spec.type === 'number' && !Number.isFinite(Number(value))) {
      errors.push(`${spec.label} must be a number`);
    }
    if (spec.type === 'boolean' && typeof value !== 'boolean') {
      errors.push(`${spec.label} must be true or false`);
    }
    if (spec.type === 'enum' && spec.options && !spec.options.includes(String(value))) {
      errors.push(`${spec.label} must be one of: ${spec.options.join(', ')}`);
    }
  }

  return { ok: errors.length === 0, errors };
}

function isBlank(value: unknown): boolean {
  return value === undefined || value === null || (typeof value === 'string' && value.trim() === '');
}

function num(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export interface PriceEstimate {
  min: number;
  max: number;
  currency: string;
  unit: string;
  quantity_basis: number;
  is_estimate: true;
  disclaimer: string;
}

/**
 * Indicative pricing from the category price hint. Deliberately an estimate:
 * only a provider quote is authoritative.
 */
export function estimatePrice(
  category: CategoryDefinition,
  attributes: Record<string, unknown>
): PriceEstimate {
  const hint = category.priceHint;
  let basis = 1;

  if (hint.unit === 'per_hour') basis = num(attributes.hours) ?? 1;
  else if (hint.unit === 'per_day') basis = num(attributes.days) ?? 1;
  else if (hint.unit === 'per_item') basis = num(attributes.quantity) ?? num(attributes.guests) ?? 1;
  else basis = 1;

  basis = Math.max(1, Math.min(basis, 100));

  return {
    min: Math.round(hint.min * basis),
    max: Math.round(hint.max * basis),
    currency: 'INR',
    unit: hint.unit,
    quantity_basis: basis,
    is_estimate: true,
    disclaimer: 'Indicative demo estimate. A provider quote is the authoritative price.',
  };
}

export function summariseRequest(
  category: CategoryDefinition,
  attributes: Record<string, unknown>
): string {
  const parts = Object.entries(attributes)
    .filter(([, v]) => !isBlank(v))
    .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${String(v)}`);
  return `${category.name}${parts.length ? ' — ' + parts.join(', ') : ''}`;
}

const AREAS = [
  'indiranagar', 'koramangala', 'hsr layout', 'whitefield', 'jayanagar', 'jp nagar',
  'btm layout', 'malleshwaram', 'hebbal', 'yelahanka', 'electronic city',
  'marathahalli', 'rajajinagar', 'banashankari', 'bellandur', 'sarjapur',
  'kr puram', 'mg road', 'shivajinagar', 'basavanagudi', 'hennur', 'kengeri',
];

function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

const AFFIRMATIVE = /^(yes|yep|yeah|yup|sure|ok|okay|confirm|confirmed|go ahead|do it|book it|proceed|haan|ha|theek hai)\b/i;
const NEGATIVE = /^(no|nope|nah|cancel|stop|not now|don't|dont)\b/i;

export function isAffirmative(text: string): boolean {
  return AFFIRMATIVE.test(text.trim());
}

export function isNegative(text: string): boolean {
  return NEGATIVE.test(text.trim());
}

/**
 * Deterministic slot filling. Tries structured patterns first, then falls back
 * to treating the whole message as the value of the last missing text field.
 * An LLM can be layered on top later, but this keeps the demo reliable.
 */
export function extractAttributes(
  category: CategoryDefinition,
  text: string,
  existing: Record<string, unknown> = {}
): Record<string, unknown> {
  const next: Record<string, unknown> = { ...existing };
  const keys = new Set(category.requiredAttributes.map((a) => a.key));
  const lower = text.toLowerCase();

  const assignNumber = (key: string, re: RegExp) => {
    if (!keys.has(key) || !isBlank(next[key])) return;
    const m = text.match(re);
    if (m) next[key] = Number(m[1]);
  };

  assignNumber('hours', /(\d+(?:\.\d+)?)\s*(?:hours?|hrs?)\b/i);
  assignNumber('days', /(\d+(?:\.\d+)?)\s*(?:days?)\b/i);
  assignNumber('guests', /(\d+)\s*(?:guests?|people|persons?|pax)\b/i);
  assignNumber('quantity', /(\d+)\s*(?:x|pcs?|pieces?|packs?|bottles?|portions?|plates?)\b/i);
  assignNumber('child_age', /(\d+)\s*(?:years?\s*old|yo)\b/i);
  assignNumber('budget_max', /(?:under|below|max|budget|upto|up to)\s*₹?\s*(\d+)/i);
  assignNumber('budget', /(?:budget|under|below)\s*₹?\s*(\d+)/i);

  if (keys.has('area') && isBlank(next.area)) {
    const found = AREAS.find((a) => lower.includes(a));
    if (found) next.area = titleCase(found);
  }

  for (const key of ['scheduled_for', 'pickup_time', 'when']) {
    if (keys.has(key) && isBlank(next[key])) {
      if (/\b(today|tomorrow|tonight|morning|evening|afternoon|night|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d{1,2}\s*(?:am|pm))\b/i.test(text)) {
        next[key] = text.trim();
      }
    }
  }

  // Enum options
  for (const spec of category.requiredAttributes) {
    if (spec.type === 'enum' && spec.options && isBlank(next[spec.key])) {
      const hit = spec.options.find((o) => lower.includes(o.toLowerCase()));
      if (hit) next[spec.key] = hit;
    }
  }

  // Booleans — only when the message is essentially a yes/no answer.
  for (const spec of category.requiredAttributes) {
    if (spec.type === 'boolean' && isBlank(next[spec.key])) {
      if (/^(yes|yeah|yep|sure|true)\b/i.test(text.trim())) next[spec.key] = true;
      else if (/^(no|nope|false)\b/i.test(text.trim())) next[spec.key] = false;
    }
  }

  // Last-resort: one missing text/enum field → the whole message is the answer.
  const stillMissing = category.requiredAttributes.filter((a) => isBlank(next[a.key]));
  if (stillMissing.length === 1) {
    const spec = stillMissing[0];
    if (spec.type === 'text' || spec.type === 'enum') {
      next[spec.key] = text.trim();
    } else if (spec.type === 'number') {
      const bare = text.match(/-?\d+(?:\.\d+)?/);
      if (bare) next[spec.key] = Number(bare[0]);
    }
  }

  return next;
}

export function nextQuestion(category: CategoryDefinition, attributes: Record<string, unknown>): string | null {
  const missing = missingAttributes(category, attributes);
  if (missing.length === 0) return null;
  const first = missing[0];
  if (first.type === 'enum' && first.options) {
    return `${first.label} (${first.options.join(' / ')})`;
  }
  return first.label;
}
