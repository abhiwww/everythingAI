import { Router } from 'express';
import { body, param } from 'express-validator';
import { authenticate, requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validation.js';
import { asyncHandler } from '../../middleware/error.js';
import { db } from '../../db/index.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

/** POST /support/tickets — create a support ticket */
router.post(
  '/',
  authenticate,
  [
    body('type').isIn(['cancellation', 'complaint', 'incident', 'dispute', 'general']),
    body('description').isString().notEmpty(),
    body('booking_id').optional().isUUID(),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const customerId = req.user!.id;
    const { type, description, booking_id } = req.body;

    const id = uuidv4();
    await db().query(
      `INSERT INTO support_tickets (id, customer_id, booking_id, type, status)
       VALUES ($1,$2,$3,$4,'open')
       RETURNING id, customer_id, booking_id, type, status, created_at`,
      [id, customerId, booking_id ?? null, type]
    );

    if (type === 'incident') {
      const incidentId = uuidv4();
      await db().query(
        `INSERT INTO incidents (id, ticket_id, severity, description)
         VALUES ($1,$2,'high',$3)`,
        [incidentId, id, description]
      );
    }

    res.status(201).json({
      ticket: { id, customer_id: customerId, booking_id, type, status: 'open' },
      message: 'Support ticket created. A team member will review it.',
    });
  })
);

/** GET /support/tickets — list tickets (staff or own) */
router.get(
  '/',
  authenticate,
  requireRole('customer', 'admin', 'support'),
  asyncHandler(async (req, res) => {
    let sql = 'SELECT * FROM support_tickets';
    const params: any[] = [];
    if (req.user!.role === 'customer') {
      sql += ' WHERE customer_id = $1';
      params.push(req.user!.id);
    }
    sql += ' ORDER BY created_at DESC LIMIT 50';
    const result = await db().query(sql, params);
    res.json({ tickets: result.rows });
  })
);

export default router;
