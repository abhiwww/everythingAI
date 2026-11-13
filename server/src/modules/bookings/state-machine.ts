/**
 * Booking state machine.
 *
 * Allowed transitions are enforced here. Each transition records an append-only
 * event with actor, timestamp, and reason.
 *
 * Lifecycle:
 *   draft → quote_ready → customer_approved → provider_pending → confirmed → in_progress → completed
 *
 * Terminal-ish: provider_declined, expired, cancel_requested, cancelled, disputed, failed
 */

export type BookingStatus =
  | 'draft'
  | 'quote_ready'
  | 'customer_approved'
  | 'provider_pending'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'provider_declined'
  | 'expired'
  | 'cancel_requested'
  | 'cancelled'
  | 'disputed'
  | 'failed';

export type Role = 'customer' | 'provider' | 'admin' | 'support' | 'system';

export interface TransitionRule {
  from: BookingStatus | BookingStatus[];
  to: BookingStatus;
  allowedRoles: Role[];
  requiresCustomerApproval?: boolean; // true if price/provider/time changed materially
}

export const ALLOWED_TRANSITIONS: TransitionRule[] = [
  // Customer prepares a booking from a quote
  { from: 'draft', to: 'quote_ready', allowedRoles: ['customer'] },
  // Customer approves the quote
  { from: 'quote_ready', to: 'customer_approved', allowedRoles: ['customer'], requiresCustomerApproval: true },
  // Customer submits the booking request (sends to provider)
  { from: 'customer_approved', to: 'provider_pending', allowedRoles: ['customer'], requiresCustomerApproval: true },
  // Provider accepts
  { from: 'provider_pending', to: 'confirmed', allowedRoles: ['provider'] },
  // Provider declines
  { from: 'provider_pending', to: 'provider_declined', allowedRoles: ['provider'] },
  // System expires a pending request (timeout)
  { from: 'provider_pending', to: 'expired', allowedRoles: ['admin', 'support', 'system'] },
  // Confirmed → in progress (provider starts)
  { from: 'confirmed', to: 'in_progress', allowedRoles: ['provider', 'admin', 'support'] },
  // In progress → completed
  { from: 'in_progress', to: 'completed', allowedRoles: ['provider', 'admin', 'support', 'customer'] },
  // Cancellation request
  { from: 'confirmed', to: 'cancel_requested', allowedRoles: ['customer', 'admin', 'support'] },
  { from: 'in_progress', to: 'cancel_requested', allowedRoles: ['customer', 'admin', 'support'] },
  { from: 'provider_pending', to: 'cancel_requested', allowedRoles: ['customer', 'admin', 'support'] },
  // Cancel confirmed
  { from: 'cancel_requested', to: 'cancelled', allowedRoles: ['admin', 'support', 'customer'] },
  // Dispute
  { from: 'completed', to: 'disputed', allowedRoles: ['customer', 'admin', 'support'] },
  { from: 'in_progress', to: 'disputed', allowedRoles: ['customer', 'admin', 'support'] },
  // Failure
  { from: 'provider_pending', to: 'failed', allowedRoles: ['admin', 'support', 'system'] },
  { from: 'confirmed', to: 'failed', allowedRoles: ['admin', 'support', 'system'] },
  { from: 'in_progress', to: 'failed', allowedRoles: ['admin', 'support', 'system'] },
];

export function isAllowedTransition(
  from: BookingStatus,
  to: BookingStatus,
  actorRole: Role
): { allowed: boolean; rule?: TransitionRule; reason?: string } {
  const rule = ALLOWED_TRANSITIONS.find(
    (r) =>
      (Array.isArray(r.from) ? r.from.includes(from) : r.from === to === undefined ? false : r.from === from) &&
      r.to === to &&
      r.allowedRoles.includes(actorRole)
  );
  if (!rule) {
    return { allowed: false, reason: `Transition ${from} → ${to} not allowed for role ${actorRole}` };
  }
  return { allowed: true, rule };
}

export function requiresCustomerApproval(
  from: BookingStatus,
  to: BookingStatus
): boolean {
  const rule = ALLOWED_TRANSITIONS.find((r) => r.to === to);
  return !!rule?.requiresCustomerApproval;
}

export const TERMINAL_STATUSES: BookingStatus[] = [
  'completed', 'provider_declined', 'expired', 'cancelled', 'disputed', 'failed',
];

export function isTerminal(status: BookingStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

export function canCustomerCancel(status: BookingStatus): boolean {
  return ['confirmed', 'in_progress', 'provider_pending'].includes(status);
}
