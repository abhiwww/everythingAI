/**
 * Universal order API.
 *
 * GET  /orders          — my orders (customer)
 * GET  /orders/:id      — one order
 * POST /orders/:id/status — provider/admin moves the fulfilment state
 */

import { Router } from 'express';
import { body, param } from 'express-validator';
import { authenticate } from '../../middleware/auth.js';
import { validate } from '../../middleware/validation.js';
import { asyncHandler } from '../../middleware/error.js';
import { db } from '../../db/index.js';
import { advanceOrder, getOrderRow, listOrders } from '../requests/service.js';
import type { OrderStatus } from '../../domain/request-flow.js';

const router = Router();

const ORDER_STATUSES: OrderStatus[] = [
  'confirmed',
  'preparing',
  'in_progress',
  'completed',
  'cancelled',
  'disputed',
];

router.get(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    const orders = await listOrders(req.user!.id);
    res.json({ orders });
  })
);

router.get(
  '/:id',
  authenticate,
  [param('id').isUUID()],
  validate,
  asyncHandler(async (req, res) => {
    const order = await getOrderRow(req.params.id);
    if (!order) {
      res.status(404).json({ error: 'not_found', message: 'Order not found' });
      return;
    }

    const isCustomer = order.customer_id === req.user!.id;
    const isStaff = ['admin', 'support'].includes(req.user!.role);
    let isProvider = false;
    if (!isCustomer && !isStaff) {
      const provider = await db().query('SELECT id FROM provider_profiles WHERE user_id = $1', [
        req.user!.id,
      ]);
      isProvider = provider.rows[0]?.id === order.provider_id;
    }

    if (!isCustomer && !isStaff && !isProvider) {
      res.status(403).json({ error: 'forbidden', message: 'You do not have access to this order' });
      return;
    }

    res.json({ order });
  })
);

router.post(
  '/:id/status',
  authenticate,
  [param('id').isUUID(), body('status').isIn(ORDER_STATUSES), body('reason').optional().isString()],
  validate,
  asyncHandler(async (req, res) => {
    const outcome = await advanceOrder({
      actorId: req.user!.id,
      actorRole: req.user!.role,
      orderId: req.params.id,
      to: req.body.status as OrderStatus,
      reason: req.body.reason,
    });
    if (!outcome.ok) {
      res.status(outcome.httpStatus).json({ error: outcome.code, message: outcome.message });
      return;
    }
    res.json(outcome.data);
  })
);

export default router;
