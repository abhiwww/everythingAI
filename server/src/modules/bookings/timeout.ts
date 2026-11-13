/**
 * Provider-response timeout handler.
 *
 * When a booking request is in 'provider_pending' state and the provider
 * does not respond before the timeout, the booking transitions to 'expired'
 * and the customer is notified with alternatives.
 */

import { db } from '../../db/index.js';
import { logger } from '../../logger.js';
import { isAllowedTransition } from './state-machine.js';

export const PROVIDER_RESPONSE_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

export interface TimeoutJob {
  bookingId: string;
  scheduledAt: string;
}

/**
 * Expire pending bookings whose provider response timeout has passed.
 * Called by a background worker (Redis Bull / node-cron / similar).
 */
export async function expirePendingBookings(): Promise<{ expired: string[]; errors: string[] }> {
  const expired: string[] = [];
  const errors: string[] = [];

  const now = new Date().toISOString();

  // Find bookings in provider_pending whose scheduled time has passed
  const result = await db().query(
    `SELECT id, scheduled_at FROM bookings
     WHERE status = $1 AND scheduled_at < $2`,
    ['provider_pending', now]
  );

  for (const row of result.rows) {
    const bookingId = row.id as string;
    try {
      const { allowed, reason } = isAllowedTransition(
        'provider_pending' as const,
        'expired',
        'system'
      );
      if (!allowed) {
        errors.push(`${bookingId}: ${reason}`);
        continue;
      }

      await db().query(
        `UPDATE bookings SET status = $1, updated_at = now() WHERE id = $2 AND status = $3`,
        ['expired', bookingId, 'provider_pending']
      );

      await db().query(
        `INSERT INTO booking_events (booking_id, from_status, to_status, actor_id, actor_role, reason)
         VALUES ($1,'provider_pending','expired',NULL,'system','Provider response timeout — booking expired')`,
        [bookingId]
      );

      expired.push(bookingId);
      logger.info({ bookingId }, 'Booking expired due to provider timeout');
    } catch (err) {
      logger.error({ err, bookingId }, 'Failed to expire booking');
      errors.push(`${bookingId}: ${(err as Error).message}`);
    }
  }

  return { expired, errors };
}
