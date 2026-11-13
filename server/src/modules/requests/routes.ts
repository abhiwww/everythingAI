/**
 * Universal request API.
 *
 * POST   /requests                        — create a draft / confirmable request
 * GET    /requests                        — my requests
 * GET    /requests/:id                    — one request
 * POST   /requests/:id/confirm            — send to providers (still not a booking)
 * POST   /requests/:id/cancel             — cancel
 * POST   /requests/:id/offers             — provider submits an offer
 * GET    /requests/:id/offers             — offers on a request
 * POST   /requests/:id/offers/:offerId/accept — customer accepts → order confirmed
 */

import { Router } from 'express';
import { body, param } from 'express-validator';
import { authenticate } from '../../middleware/auth.js';
import { validate } from '../../middleware/validation.js';
import { asyncHandler } from '../../middleware/error.js';
import {
  acceptOffer,
  cancelRequest,
  confirmRequest,
  createOffer,
  createRequest,
  getRequestRow,
  listOffers,
  listRequests,
} from './service.js';

const router = Router();

router.post(
  '/',
  authenticate,
  [
    body('category_slug').isString().notEmpty(),
    body('raw_text').optional().isString(),
    body('attributes').optional().isObject(),
    body('conversation_id').optional().isUUID(),
    body('city').optional().isString(),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const outcome = await createRequest({
      customerId: req.user!.id,
      categorySlug: req.body.category_slug,
      rawText: req.body.raw_text,
      attributes: req.body.attributes ?? {},
      conversationId: req.body.conversation_id,
      city: req.body.city,
    });

    if (!outcome.ok) {
      res.status(outcome.httpStatus).json({
        error: outcome.code,
        message: outcome.message,
        ...outcome.data,
      });
      return;
    }

    res.status(201).json(outcome.data);
  })
);

router.get(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    const requests = await listRequests(req.user!.id);
    res.json({ requests });
  })
);

router.get(
  '/:id',
  authenticate,
  [param('id').isUUID()],
  validate,
  asyncHandler(async (req, res) => {
    const request = await getRequestRow(req.params.id);
    if (!request) {
      res.status(404).json({ error: 'not_found', message: 'Request not found' });
      return;
    }
    if (request.customer_id !== req.user!.id && !['admin', 'support'].includes(req.user!.role)) {
      res.status(403).json({ error: 'forbidden', message: 'You do not own this request' });
      return;
    }
    res.json({ request });
  })
);

router.post(
  '/:id/confirm',
  authenticate,
  [param('id').isUUID()],
  validate,
  asyncHandler(async (req, res) => {
    const outcome = await confirmRequest(req.user!.id, req.params.id);
    if (!outcome.ok) {
      res.status(outcome.httpStatus).json({ error: outcome.code, message: outcome.message });
      return;
    }
    res.json({
      ...outcome.data,
      notice:
        'Sent to matching providers. This is not a confirmed booking until a provider accepts.',
    });
  })
);

router.post(
  '/:id/cancel',
  authenticate,
  [param('id').isUUID()],
  validate,
  asyncHandler(async (req, res) => {
    const outcome = await cancelRequest(req.user!.id, req.params.id);
    if (!outcome.ok) {
      res.status(outcome.httpStatus).json({ error: outcome.code, message: outcome.message });
      return;
    }
    res.json(outcome.data);
  })
);

router.post(
  '/:id/offers',
  authenticate,
  [
    param('id').isUUID(),
    body('price').isFloat({ gt: 0 }),
    body('eta_minutes').optional().isInt({ min: 0 }),
    body('message').optional().isString(),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const outcome = await createOffer({
      providerUserId: req.user!.id,
      requestId: req.params.id,
      price: Number(req.body.price),
      etaMinutes: req.body.eta_minutes ? Number(req.body.eta_minutes) : undefined,
      message: req.body.message,
    });
    if (!outcome.ok) {
      res.status(outcome.httpStatus).json({ error: outcome.code, message: outcome.message });
      return;
    }
    res.status(201).json(outcome.data);
  })
);

router.get(
  '/:id/offers',
  authenticate,
  [param('id').isUUID()],
  validate,
  asyncHandler(async (req, res) => {
    const request = await getRequestRow(req.params.id);
    if (!request) {
      res.status(404).json({ error: 'not_found', message: 'Request not found' });
      return;
    }
    const offers = await listOffers(req.params.id);
    res.json({ offers });
  })
);

router.post(
  '/:id/offers/:offerId/accept',
  authenticate,
  [param('id').isUUID(), param('offerId').isUUID()],
  validate,
  asyncHandler(async (req, res) => {
    const outcome = await acceptOffer(req.user!.id, req.params.id, req.params.offerId);
    if (!outcome.ok) {
      res.status(outcome.httpStatus).json({ error: outcome.code, message: outcome.message });
      return;
    }
    res.status(201).json({
      ...outcome.data,
      notice: 'Order confirmed by the provider offer. This is now a real order record.',
    });
  })
);

export default router;
