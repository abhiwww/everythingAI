/**
 * AI orchestration layer — the concierge.
 *
 * Core rule: the model is probabilistic and untrusted. Backend code enforces
 * permissions, compliance, confirmation, and business rules. The AI never
 * triggers a consequential action without server-side recorded approval.
 *
 * This orchestrator is deliberately deterministic: category resolution, slot
 * filling, compliance and pricing all come from `src/domain`, so the product
 * keeps working when the AI provider is disabled, rate-limited, or wrong.
 * A real LLM can be layered on top for phrasing only — never for permissions.
 */

import { config, isDemoMode } from '../../config.js';
import { db } from '../../db/index.js';
import { logger } from '../../logger.js';
import type { Intent, ToolName } from '../../types/index.js';
import { CATEGORIES, getCategory, resolveCategory, type AttributeSpec, type CategoryDefinition } from '../../domain/taxonomy.js';
import { checkCompliance, type ComplianceDecision } from '../../domain/compliance.js';
import {
  estimatePrice,
  extractAttributes,
  isAffirmative,
  isNegative,
  missingAttributes,
  summariseRequest,
  type PriceEstimate,
} from '../../domain/request-flow.js';
import { cancelRequest, confirmRequest, createRequest } from '../requests/service.js';

export interface OrchestrateInput {
  conversationId: string;
  customerId: string;
  customerMessage: string;
}

export interface ConciergeCard {
  type: 'needs_details' | 'request_draft' | 'request_sent' | 'compliance_block' | 'categories';
  category?: { slug: string; name: string; provider_role: string };
  attributes?: Record<string, unknown>;
  missing?: { key: string; label: string; type: string; options?: string[] }[];
  estimate?: PriceEstimate;
  request_id?: string;
  compliance?: ComplianceDecision;
}

export interface OrchestrateResponse {
  reply: string;
  is_ai_generated: boolean;
  demo_mode: boolean;
  intent: Intent;
  tools_used?: ToolName[];
  suggestions?: unknown[];
  requires_followup: boolean;
  followup_questions?: string[];
  booking_preview?: unknown;
  warning?: string;
  card?: ConciergeCard;
}

interface PendingState {
  category_slug?: string;
  attributes?: Record<string, unknown>;
  raw_text?: string;
  request_id?: string;
}

const DEMO_NOTE = '\n\n[Demo mode — sample data only. No real availability, fulfilment, payments or deliveries.]';

function intentFor(category: CategoryDefinition | null): Intent {
  if (!category) return 'other';
  switch (category.vertical) {
    case 'goods':
    case 'food':
    case 'delivery':
    case 'rental':
      return 'order';
    case 'planning':
      return 'planning';
    case 'home_service':
    case 'personal_service':
    case 'ride':
    case 'professional':
      return 'local_service';
    default:
      return 'other';
  }
}

function label(spec: AttributeSpec): string {
  const example = spec.example ? ` (e.g. ${spec.example})` : '';
  const options = spec.options ? ` — ${spec.options.join(' / ')}` : '';
  return `${spec.label}${options}${example}`;
}

function describeMissing(category: CategoryDefinition, missing: ReturnType<typeof missingAttributes>): string {
  if (missing.length === 1) {
    return `I just need one thing: ${label(category.requiredAttributes.find((a) => a.key === missing[0].key)!)}`;
  }
  const lines = missing.map((m) => {
    const spec = category.requiredAttributes.find((a) => a.key === m.key);
    return `• ${spec ? label(spec) : m.label}`;
  });
  return `I need a few details before this can go to providers:\n${lines.join('\n')}`;
}

function money(n: number): string {
  return `₹${n.toLocaleString('en-IN')}`;
}

function formatEstimate(estimate: PriceEstimate): string {
  const unitText =
    estimate.unit === 'per_hour' ? ' / hour'
    : estimate.unit === 'per_day' ? ' / day'
    : estimate.unit === 'per_item' ? ' / item'
    : '';
  return `${money(estimate.min)}–${money(estimate.max)}${unitText} (${estimate.disclaimer})`;
}

async function loadPending(conversationId: string): Promise<PendingState | null> {
  try {
    const result = await db().query('SELECT workflow_context FROM conversations WHERE id = $1', [
      conversationId,
    ]);
    const ctx = result.rows[0]?.workflow_context;
    if (ctx && typeof ctx === 'object' && ctx.pending) return ctx.pending as PendingState;
    if (typeof ctx === 'string') {
      const parsed = JSON.parse(ctx);
      if (parsed?.pending) return parsed.pending as PendingState;
    }
  } catch (err) {
    logger.warn({ err }, 'Could not load conversation context');
  }
  return null;
}

async function savePending(conversationId: string, pending: PendingState | null): Promise<void> {
  try {
    const ctx = pending ? { pending } : {};
    await db().query('UPDATE conversations SET workflow_context = $1::jsonb, updated_at = now() WHERE id = $2', [
      JSON.stringify(ctx),
      conversationId,
    ]);
  } catch (err) {
    logger.warn({ err }, 'Could not save conversation context');
  }
}

function baseResponse(partial: Partial<OrchestrateResponse> & { reply: string }): OrchestrateResponse {
  const demo = isDemoMode();
  return {
    is_ai_generated: true,
    demo_mode: demo,
    intent: 'other',
    requires_followup: false,
    tools_used: [],
    suggestions: [],
    ...partial,
    reply: partial.reply + (demo ? DEMO_NOTE : ''),
    warning: demo ? 'Demo mode — sample data, no real fulfilment' : undefined,
  };
}

function categoriesHelp(): string {
  const lines = CATEGORIES.filter((c) => c.transactable)
    .slice(0, 12)
    .map((c) => `• ${c.name} — ${c.examples[0]}`);
  return (
    'I can arrange almost anything legal in Bengaluru — goods, food, vehicles, home services, ' +
    'workers, repairs, personal services and planning. For example:\n' +
    lines.join('\n') +
    '\n\nTell me what you need in your own words. I will work out the category, ask for the missing details, ' +
    'get you quotes, and only confirm after you approve.'
  );
}

async function handleConfirmation(
  input: OrchestrateInput,
  pending: PendingState
): Promise<OrchestrateResponse | null> {
  const message = input.customerMessage;
  if (!pending.request_id) return null;

  if (isAffirmative(message)) {
    const outcome = await confirmRequest(input.customerId, pending.request_id);
    if (!outcome.ok) {
      // A stale or already-confirmed request should not trap the conversation.
      if (outcome.code === 'invalid_state') {
        await savePending(input.conversationId, null);
        return baseResponse({
          reply: `That request is already ${outcome.message}. Tell me what else you need and I'll start a new one.`,
          intent: 'other',
        });
      }
      return baseResponse({
        reply: `I couldn't send it: ${outcome.message}`,
        intent: 'order',
        requires_followup: true,
      });
    }

    await savePending(input.conversationId, null);
    const category = getCategory(pending.category_slug ?? '');
    return baseResponse({
      reply:
        `Sent your ${category?.name ?? 'request'} to matching providers. ` +
        'You will see offers here. **Nothing is confirmed yet** — it becomes a real order only when you accept a provider\'s offer.',
      intent: intentFor(category ?? null),
      tools_used: ['confirm_request'],
      card: {
        type: 'request_sent',
        request_id: pending.request_id,
        category: category
          ? { slug: category.slug, name: category.name, provider_role: category.providerRole }
          : undefined,
      },
    });
  }

  if (isNegative(message)) {
    await cancelRequest(input.customerId, pending.request_id);
    await savePending(input.conversationId, null);
    return baseResponse({
      reply: 'Cancelled — nothing was booked and no provider was contacted.',
      intent: 'other',
    });
  }

  return null;
}

export async function orchestrate(input: OrchestrateInput): Promise<OrchestrateResponse> {
  const message = input.customerMessage.trim();
  const pending = await loadPending(input.conversationId);

  try {
    // 1. Confirmation / cancellation of a draft awaiting approval.
    if (pending?.request_id) {
      const handled = await handleConfirmation(input, pending);
      if (handled) return handled;
    }

    // 2. Hard blocks always run first.
    const preCompliance = checkCompliance({ text: message, category: null });
    if (preCompliance.decision === 'block') {
      await savePending(input.conversationId, null);
      return baseResponse({
        reply: preCompliance.message,
        intent: 'unsupported',
        tools_used: ['resolve_category'],
        card: { type: 'compliance_block', compliance: preCompliance },
      });
    }

    // 3. Resolve the category from the message.
    const resolution = resolveCategory(message);
    if (!resolution.category) {
      if (/\b(what can you|what do you|help|options|categories|menu)\b/i.test(message)) {
        return baseResponse({
          reply: categoriesHelp(),
          intent: 'other',
          card: { type: 'categories' },
        });
      }
      return baseResponse({
        reply:
          "I didn't map that to a category. Tell me what you want to get done — for example " +
          '"a pack of gum", "a cook for 3 hours", "rent an SUV for 2 days", "a plumber", or "a used car under 5 lakh".',
        intent: 'other',
        requires_followup: true,
      });
    }

    const category = resolution.category;
    const categoryCard = { slug: category.slug, name: category.name, provider_role: category.providerRole };

    // 4. Continue an in-progress draft, or start a new one.
    const continuing = pending?.category_slug === category.slug;
    const existing = continuing ? pending?.attributes ?? {} : {};
    const rawText = continuing ? `${pending?.raw_text ?? ''} ${message}`.trim() : message;
    const attributes = extractAttributes(category, message, existing);

    // 5. Compliance on the full picture (text + merged attributes).
    const compliance = checkCompliance({ text: rawText, category, attributes });
    if (compliance.decision === 'block') {
      await savePending(input.conversationId, null);
      return baseResponse({
        reply: compliance.message,
        intent: 'unsupported',
        tools_used: ['resolve_category'],
        card: { type: 'compliance_block', compliance, category: categoryCard },
      });
    }
    if (compliance.decision === 'gate') {
      await savePending(input.conversationId, null);
      const gateIntent: Intent =
        category.vertical === 'planning'
          ? 'planning'
          : compliance.code === 'category_not_enabled'
          ? 'unsupported'
          : intentFor(category);
      return baseResponse({
        reply: compliance.message,
        intent: gateIntent,
        tools_used: ['resolve_category'],
        card: { type: 'compliance_block', compliance, category: categoryCard },
      });
    }

    // 6. Still missing details?
    const missing = missingAttributes(category, attributes);
    if (missing.length > 0) {
      await savePending(input.conversationId, {
        category_slug: category.slug,
        attributes,
        raw_text: rawText,
      });
      return baseResponse({
        reply: `Got it — ${category.name} (${category.providerRole}).\n\n${describeMissing(category, missing)}`,
        intent: intentFor(category),
        requires_followup: true,
        followup_questions: missing.map((m) => m.label),
        tools_used: ['resolve_category'],
        card: { type: 'needs_details', category: categoryCard, attributes, missing },
      });
    }

    // 7. Everything present → create the draft, then ask for explicit approval.
    const outcome = await createRequest({
      customerId: input.customerId,
      categorySlug: category.slug,
      rawText,
      attributes,
      conversationId: input.conversationId,
    });

    if (!outcome.ok) {
      await savePending(input.conversationId, null);
      return baseResponse({
        reply: outcome.message ?? 'I could not create that request.',
        intent: intentFor(category),
        card: outcome.data?.compliance
          ? { type: 'compliance_block', compliance: outcome.data.compliance, category: categoryCard }
          : undefined,
      });
    }

    const request = outcome.data!.request!;
    await savePending(input.conversationId, {
      category_slug: category.slug,
      attributes,
      raw_text: rawText,
      request_id: request.id,
    });

    const estimate = outcome.data!.estimate ?? estimatePrice(category, attributes);

    return baseResponse({
      reply:
        `Here's the draft:\n\n` +
        `**${category.name}** · ${category.providerRole}\n` +
        `${summariseRequest(category, attributes)}\n` +
        `Estimate: ${formatEstimate(estimate)}\n\n` +
        'Reply **YES** to send this to providers, or tell me what to change. ' +
        'Nothing is booked until you approve and a provider accepts.',
      intent: intentFor(category),
      requires_followup: true,
      tools_used: ['resolve_category', 'create_request'],
      booking_preview: {
        request_id: request.id,
        category_slug: category.slug,
        attributes,
        estimate,
        status: request.status,
      },
      card: {
        type: 'request_draft',
        request_id: request.id,
        category: categoryCard,
        attributes,
        estimate,
        compliance,
      },
    });
  } catch (err) {
    logger.error({ err, conversationId: input.conversationId }, 'Concierge failed — returning safe fallback');
    return baseResponse({
      reply:
        "Something went wrong on my side, so I haven't created or changed anything. " +
        'Please try again in a moment.',
      intent: 'other',
    });
  }
}

/** Exposed for tests / diagnostics: which categories exist and what the model sees. */
export function conciergeCapabilities() {
  return {
    ai_enabled: config.aiEnabled,
    demo_mode: isDemoMode(),
    categories: CATEGORIES.map((c) => ({
      slug: c.slug,
      name: c.name,
      vertical: c.vertical,
      provider_role: c.providerRole,
      transactable: c.transactable,
    })),
  };
}
