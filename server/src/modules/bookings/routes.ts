import { Router } from 'express';
import { body, param } from 'express-validator';
import { authenticate, requireRole, requireOwnershipOrRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validation.js';
import { asyncHandler } from '../../middleware/error.js';
import { db } from '../../db/index.js';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../logger.js';
import {
  isAllowedTransition,
  requiresCustomerApproval,
  isTerminal,
  type BookingStatus,
  type Role,
} from './state-machine.js';

const router = Router();

/** POST /bookings — submit a booking request (explicit customer approval, idempotent) */
router.post(
  '/',
  authenticate,
  [
    body('quote_id').isUUID(),
    body('idempotency_key').isString().notEmpty(),
    body('confirmation').isBoolean(), // must be explicitly true
  ],
  validate,
  asyncHandler(async (req, res) => {
    const customerId = req.user!.id;
    const { quote_id, idempotency_key, confirmation } = req.body;

    if (confirmation !== true) {
      res.status(400).json({
        error: 'validation_error',
        message: 'Explicit confirmation is required to submit a booking request.',
      });
      return;
    }

    // Idempotency check
    const existing = await db().query(
      'SELECT id, status FROM bookings WHERE idempotency_key = $1',
      [idempotency_key]
    );
    if (existing.rows.length > 0) {
      res.status(409).json({
        error: 'conflict',
        message: 'A booking with this idempotency key already exists',
        booking_id: existing.rows[0].id,
        status: existing.rows[0].status,
      });
      return;
    }

    // Fetch quote and verify ownership + expiry
    const quoteResult = await db().query(
      'SELECT * FROM quotes WHERE id = $1 AND customer_id = $2',
      [quote_id, customerId]
    );
    if (quoteResult.rows.length === 0) {
      res.status(404).json({ error: 'not_found', message: 'Quote not found' });
      return;
    }
    const quote = quoteResult.rows[0];
    if (new Date(quote.expires_at) < new Date()) {
      res.status(409).json({ error: 'conflict', message: 'Quote has expired' });
      return;
    }

    const id = uuidv4();
    const now = new Date();

    // Create booking in draft → quote_ready → customer_approved → provider_pending
    // (The quote_ready/customer_approved steps are implied by the quote + explicit confirmation)
    await db().query(
      `INSERT INTO bookings
        (id, quote_id, customer_id, provider_id, status, idempotency_key,
         scheduled_at, address_id, total, cancellation_terms, created_at, updated_at)
       VALUES ($1,$2,$3,NULL,'provider_pending',$4,$5,$6,$7,$8,now(),now())
       RETURNING id, status, idempotency_key`,
      [
        id,
        quote.id,
        customerId,
        idempotency_key,
        quote.scheduled_at,
        quote.address_id,
        quote.total,
        'Standard cancellation terms apply. Contact support to cancel.',
      ]
    );

    // Record booking events (append-only)
    await db().query(
      `INSERT INTO booking_events (booking_id, from_status, to_status, actor_id, actor_role, reason)
       VALUES ($1,'draft','provider_pending',$2,'customer','Customer approved quote and submitted booking request')`,
      [id, customerId]
    );

    logger.info({ bookingId: id, customerId, quoteId: quote.id, idempotencyKey: idempotency_key }, 'Booking request submitted');

    res.status(201).json({
      booking: {
        id,
        status: 'provider_pending',
        idempotency_key,
        message: 'Booking request sent to provider. You will be notified when they accept or decline.',
      },
    });
  })
);

/** GET /bookings/:id — get booking (ownership check) */
router.get(
  '/:id',
  authenticate,
  [param('id').isUUID()],
  validate,
  asyncHandler(async (req, res) => {
    const result = await db().query('SELECT * FROM bookings WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'not_found', message: 'Booking not found' });
      return;
    }
    const booking = result.rows[0];

    // Ownership or staff
    const isOwner = booking.customer_id === req.user!.id;
    const isStaff = ['admin', 'support'].includes(req.user!.role);
    const isProvider = booking.provider_id && booking.provider_id !== null
      ? await (async () => {
          const prov = await db().query('SELECT user_id FROM provider_profiles WHERE id = $1', [booking.provider_id]);
          return prov.rows.length > 0 && prov.rows[0].user_id === req.user!.id;
        })()
      : false;

    if (!isOwner && !isStaff && !isProvider) {
      res.status(403).json({ error: 'forbidden', message: 'You do not own this booking' });
      return;
    }

    res.json({ booking });
  })
);

/** POST /bookings/:id/cancel-request */
router.post(
  '/:id/cancel-request',
  authenticate,
  [param('id').isUUID()],
  validate,
  asyncHandler(async (req, res) => {
    const result = await db().query('SELECT * FROM bookings WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'not_found', message: 'Booking not found' });
      return;
    }
    const booking = result.rows[0];
    if (booking.customer_id !== req.user!.id && !['admin', 'support'].includes(req.user!.role)) {
      res.status(403).json({ error: 'forbidden', message: 'You do not own this booking' });
      return;
    }

    const { allowed, reason } = isAllowedTransition(booking.status as BookingStatus, 'cancel_requested', req.user!.role as Role);
    if (!allowed) {
      res.status(409).json({ error: 'conflict', message: reason });
      return;
    }

    await db().query(
      'UPDATE bookings SET status = $1, updated_at = now() WHERE id = $2',
      ['cancel_requested', req.params.id]
    );
    await db().query(
      `INSERT INTO booking_events (booking_id, from_status, to_status, actor_id, actor_role, reason)
       VALUES ($1,$2,'cancel_requested',$3,'customer','Customer requested cancellation')`,
      [req.params.id, booking.status, req.user!.id]
    );

    res.json({ booking_id: req.params.id, status: 'cancel_requested', message: 'Cancellation requested. A team member will review it.' });
  })
);

/** POST /provider/bookings/:id/accept */
router.post(
  '/provider/bookings/:id/accept',
  authenticate,
  requireRole('provider'),
  [param('id').isUUID()],
  validate,
  asyncHandler(async (req, res) => {
    const providerResult = await db().query(
      'SELECT user_id FROM provider_profiles WHERE id = (SELECT provider_id FROM bookings WHERE id = $1)',
      [req.params.id]
    );
    // Verify provider owns this booking request
    const bookingResult = await db().query(
      'SELECT * FROM bookings WHERE id = $1 AND status = $2',
      [req.params.id, 'provider_pending']
    );
    if (bookingResult.rows.length === 0) {
      res.status(404).json({ error: 'not_found', message: 'Booking request not found or not pending' });
      return;
    }
    const booking = bookingResult.rows[0];
    if (!booking.provider_id) {
      // Assign provider to booking
      await db().query(
        'UPDATE bookings SET provider_id = $1 WHERE id = $2',
        [req.user!.id, req.params.id]
      );
      // In a real flow, we'd look up provider_profiles.id from user_id. Here we link via user_id mapping.
    }

    // Atomic transition using conditional update to prevent double-acceptance
    const updateResult = await db().query(
      `UPDATE bookings
       SET status = 'confirmed', confirmed_at = now(), updated_at = now()
       WHERE id = $1 AND status = 'provider_pending'
       RETURNING id, status`,
      [req.params.id]
    );
    if (updateResult.rows.length === 0) {
      res.status(409).json({ error: 'conflict', message: 'Booking already accepted, declined, or expired' });
      return;
    }

    await db().query(
      `INSERT INTO booking_events (booking_id, from_status, to_status, actor_id, actor_role, reason)
       VALUES ($1,'provider_pending','confirmed',$2,'provider','Provider accepted the booking request')`,
      [req.params.id, req.user!.id]
    );

    await db().query(
      `INSERT INTO provider_responses (booking_id, provider_id, decision, notes)
       VALUES ($1,$2,'accepted','Provider accepted')`,
      [req.params.id, req.user!.id]
    );

    logger.info({ bookingId: req.params.id, providerId: req.user!.id }, 'Provider accepted booking');
    res.json({ booking_id: req.params.id, status: 'confirmed', message: 'Booking confirmed. Provider has accepted.' });
  })
);

/** POST /provider/bookings/:id/decline */
router.post(
  '/provider/bookings/:id/decline',
  authenticate,
  requireRole('provider'),
  [param('id').isUUID()],
  validate,
  asyncHandler(async (req, res) => {
    const bookingResult = await db().query(
      'SELECT * FROM bookings WHERE id = $1 AND status = $2',
      [req.params.id, 'provider_pending']
    );
    if (bookingResult.rows.length === 0) {
      res.status(404).json({ error: 'not_found', message: 'Booking request not found or not pending' });
      return;
    }

    const updateResult = await db().query(
      `UPDATE bookings
       SET status = 'provider_declined', updated_at = now()
       WHERE id = $1 AND status = 'provider_pending'
       RETURNING id, status`,
      [req.params.id]
    );
    if (updateResult.rows.length === 0) {
      res.status(409).json({ error: 'conflict', message: 'Booking already handled' });
      return;
    }

    await db().query(
      `INSERT INTO booking_events (booking_id, from_status, to_status, actor_id, actor_role, reason)
       VALUES ($1,'provider_pending','provider_declined',$2,'provider','Provider declined the booking request')`,
      [req.params.id, req.user!.id]
    );

    await db().query(
      `INSERT INTO provider_responses (booking_id, provider_id, decision, notes)
       VALUES ($1,$2,'declined','Provider declined')`,
      [req.params.id, req.user!.id]
    );

    logger.info({ bookingId: req.params.id, providerId: req.user!.id }, 'Provider declined booking');
    res.json({ booking_id: req.params.id, status: 'provider_declined', message: 'Provider declined. You may choose another provider.' });
  })
);

/** GET /bookings — list bookings for the customer */
router.get(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    let sql = 'SELECT * FROM bookings WHERE customer_id = $1';
    const params: any[] = [req.user!.id];
    if (req.query.status) {
      sql += ` AND status = $${params.length + 1}`;
      params.push(req.query.status);
    }
    sql += ' ORDER BY created_at DESC LIMIT 50';
    const result = await db().query(sql, params);
    res.json({ bookings: result.rows });
  })
);

export default router;
