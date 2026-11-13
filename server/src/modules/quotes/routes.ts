import { Router } from 'express';
import { body, param } from 'express-validator';
import { authenticate } from '../../middleware/auth.js';
import { validate } from '../../middleware/validation.js';
import { asyncHandler } from '../../middleware/error.js';
import { db } from '../../db/index.js';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../logger.js';

const router = Router();

/** POST /quotes — generate a quote (read-only/compute, no booking committed) */
router.post(
  '/',
  authenticate,
  [
    body('service_category_id').isUUID(),
    body('address_id').isUUID(),
    body('scheduled_at').isISO8601(),
    body('duration_hours').isNumeric().isFloat({ min: 0.5 }),
    body('provider_id').isUUID(),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const customerId = req.user!.id;
    const {
      service_category_id,
      address_id,
      scheduled_at,
      duration_hours,
      provider_id,
    } = req.body;

    // Fetch provider pricing rules
    const providerResult = await db().query(
      'SELECT pricing_rules, display_name FROM provider_profiles WHERE id = $1 AND verification_status = $2',
      [provider_id, 'verified']
    );
    if (providerResult.rows.length === 0) {
      res.status(404).json({ error: 'not_found', message: 'Verified provider not found' });
      return;
    }
    const provider = providerResult.rows[0];
    const pricingRules =
      typeof provider.pricing_rules === 'string'
        ? JSON.parse(provider.pricing_rules)
        : provider.pricing_rules || {};

    const hourlyRate = Number(pricingRules.hourly_rate ?? 10000); // paise, default ₹100/hr
    const minimumCallout = Number(pricingRules.minimum_callout ?? hourlyRate);
    const duration = Number(duration_hours);
    let indicativePrice = hourlyRate * duration;
    if (indicativePrice < minimumCallout) indicativePrice = minimumCallout;

    const tax = Math.round(indicativePrice * 0.18); // 18% GST placeholder
    const total = indicativePrice + tax;

    const id = uuidv4();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 min expiry

    await db().query(
      `INSERT INTO quotes
        (id, customer_id, service_category_id, address_id, scheduled_at, duration_hours,
         indicative_price, price_components, tax, total, is_estimate, expires_at, version)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,true,$11,1)
       RETURNING id, customer_id, indicative_price, tax, total, is_estimate, expires_at, version`,
      [
        id,
        customerId,
        service_category_id,
        address_id,
        scheduled_at,
        duration,
        indicativePrice,
        JSON.stringify({
          base: indicativePrice - tax,
          hourly_rate_paise: hourlyRate,
          duration_hours: duration,
          minimum_callout_paise: minimumCallout,
          provider: provider.display_name,
        }),
        tax,
        total,
        expiresAt,
      ]
    );

    logger.info({ quoteId: id, customerId, total }, 'Quote generated');

    res.status(201).json({
      quote: {
        id,
        customer_id: customerId,
        provider: provider.display_name,
        indicative_price: indicativePrice,
        tax,
        total,
        currency: 'INR',
        is_estimate: true,
        expires_at: expiresAt,
        version: 1,
        price_components: {
          base: indicativePrice - tax,
          hourly_rate_paise: hourlyRate,
          duration_hours: duration,
          minimum_callout_paise: minimumCallout,
        },
        note: 'This is an estimate until confirmed. No booking is made until you explicitly approve.',
      },
    });
  })
);

/** GET /quotes/:id */
router.get(
  '/:id',
  authenticate,
  [param('id').isUUID()],
  validate,
  asyncHandler(async (req, res) => {
    const result = await db().query(
      'SELECT * FROM quotes WHERE id = $1 AND customer_id = $2',
      [req.params.id, req.user!.id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'not_found', message: 'Quote not found' });
      return;
    }
    const q = result.rows[0];
    res.json({
      quote: {
        ...q,
        price_components:
          typeof q.price_components === 'string' ? JSON.parse(q.price_components) : q.price_components,
      },
    });
  })
);

export default router;
