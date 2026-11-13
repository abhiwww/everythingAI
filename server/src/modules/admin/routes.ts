import { Router } from 'express';
import { body, param } from 'express-validator';
import { authenticate, requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validation.js';
import { asyncHandler } from '../../middleware/error.js';
import { db } from '../../db/index.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

/** GET /admin/providers — list providers with verification status */
router.get(
  '/providers',
  authenticate,
  requireRole('admin', 'support'),
  asyncHandler(async (_req, res) => {
    const result = await db().query(
      `SELECT p.id, p.user_id, p.display_name, p.categories, p.service_areas,
              p.verification_status, p.verification_reason, p.rating_label, p.created_at
       FROM provider_profiles p
       ORDER BY p.created_at DESC`
    );
    res.json({ providers: result.rows });
  })
);

/** POST /admin/providers/:id/verify — verify or reject a provider */
router.post(
  '/providers/:id/verify',
  authenticate,
  requireRole('admin'),
  [
    param('id').isUUID(),
    body('decision').isIn(['approved', 'rejected']),
    body('reason').optional().isString(),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { decision, reason } = req.body;
    const status = decision === 'approved' ? 'verified' : 'rejected';

    const result = await db().query(
      `UPDATE provider_profiles
       SET verification_status = $1, verification_reason = $2, documents_verified_at = now(), updated_at = now()
       WHERE id = $3
       RETURNING id, verification_status`,
      [status, reason ?? null, req.params.id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'not_found', message: 'Provider not found' });
      return;
    }

    await db().query(
      `INSERT INTO admin_audit_events (actor_id, action, target_type, target_id, metadata)
       VALUES ($1,'provider_verify','provider',$2,$3)`,
      [req.user!.id, req.params.id, JSON.stringify({ decision, reason, by: req.user!.id })]
    );

    res.json({ provider: result.rows[0], message: `Provider ${decision}` });
  })
);

/** GET /admin/requests — booking queue */
router.get(
  '/requests',
  authenticate,
  requireRole('admin', 'support'),
  asyncHandler(async (_req, res) => {
    const result = await db().query(
      `SELECT b.id, b.status, b.scheduled_at, b.total, b.created_at,
              u.email AS customer_email, p.display_name AS provider_name
       FROM bookings b
       JOIN users u ON b.customer_id = u.id
       LEFT JOIN provider_profiles p ON b.provider_id = p.id
       ORDER BY b.created_at DESC LIMIT 100`
    );
    res.json({ requests: result.rows });
  })
);

/** GET /admin/audit — audit log */
router.get(
  '/audit',
  authenticate,
  requireRole('admin'),
  asyncHandler(async (_req, res) => {
    const result = await db().query(
      'SELECT * FROM admin_audit_events ORDER BY created_at DESC LIMIT 100'
    );
    res.json({ audit: result.rows });
  })
);

/** GET /admin/feature-flags */
router.get(
  '/feature-flags',
  authenticate,
  requireRole('admin'),
  asyncHandler(async (_req, res) => {
    const result = await db().query('SELECT * FROM feature_flags ORDER BY name');
    res.json({ feature_flags: result.rows });
  })
);

/** POST /admin/feature-flags */
router.post(
  '/feature-flags',
  authenticate,
  requireRole('admin'),
  [body('name').isString().notEmpty(), body('enabled').isBoolean()],
  validate,
  asyncHandler(async (req, res) => {
    const { name, enabled } = req.body;
    const id = uuidv4();
    await db().query(
      `INSERT INTO feature_flags (id, name, enabled) VALUES ($1,$2,$3)
       ON CONFLICT (name) DO UPDATE SET enabled = $3, updated_at = now()
       RETURNING id, name, enabled`,
      [id, name, enabled]
    );
    res.status(201).json({ message: 'Feature flag updated' });
  })
);

export default router;
