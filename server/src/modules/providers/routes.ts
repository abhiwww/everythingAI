import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { authenticate, requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validation.js';
import { asyncHandler } from '../../middleware/error.js';
import { db } from '../../db/index.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

/** POST /providers/register — provider onboarding (documents uploaded separately) */
router.post(
  '/register',
  authenticate,
  requireRole('customer', 'provider'),
  [
    body('display_name').isString().notEmpty(),
    body('categories').isArray({ min: 1 }),
    body('service_areas').isArray({ min: 1 }),
    body('languages').isArray({ min: 1 }),
    body('pricing_rules').optional().isObject(),
    body('availability').optional().isObject(),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const { display_name, categories, service_areas, languages, pricing_rules = {}, availability = {} } = req.body;

    // Check existing provider profile
    const existing = await db().query(
      'SELECT id FROM provider_profiles WHERE user_id = $1',
      [userId]
    );
    if (existing.rows.length > 0) {
      res.status(409).json({ error: 'conflict', message: 'Provider profile already exists' });
      return;
    }

    const id = uuidv4();
    await db().query(
      `INSERT INTO provider_profiles
        (id, user_id, display_name, categories, service_areas, languages, pricing_rules, availability, verification_status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pending')
       RETURNING id, user_id, display_name, verification_status`,
      [id, userId, display_name, categories, service_areas, languages, JSON.stringify(pricing_rules), JSON.stringify(availability)]
    );

    res.status(201).json({
      provider: { id, user_id: userId, display_name, verification_status: 'pending' },
      message: 'Provider profile submitted for verification. Documents must be uploaded for review.',
    });
  })
);

/** GET /providers/me — own provider profile */
router.get(
  '/me',
  authenticate,
  requireRole('provider'),
  asyncHandler(async (req, res) => {
    const result = await db().query(
      'SELECT * FROM provider_profiles WHERE user_id = $1',
      [req.user!.id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'not_found', message: 'Provider profile not found' });
      return;
    }
    res.json({ provider: result.rows[0] });
  })
);

/** GET /providers/search — search eligible providers (read-only) */
router.get(
  '/search',
  authenticate,
  [
    query('category').isUUID(),
    query('area').optional().isString(),
    query('datetime').optional().isISO8601(),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { category, area, datetime } = req.query as any;

    let sql = `
      SELECT p.id, p.user_id, p.display_name, p.categories, p.service_areas,
             p.languages, p.pricing_rules, p.verification_status, p.rating_label
      FROM provider_profiles p
      WHERE p.verification_status = 'verified'
        AND $1 = ANY(p.categories)
    `;
    const params: any[] = [category];
    let paramIdx = 2;

    if (area) {
      sql += ` AND $${paramIdx} = ANY(p.service_areas)`;
      params.push(area);
      paramIdx++;
    }

    sql += ` ORDER BY p.created_at DESC LIMIT 50`;

    const result = await db().query(sql, params);
    res.json({
      providers: result.rows.map((p) => ({
        ...p,
        pricing_rules: typeof p.pricing_rules === 'string' ? JSON.parse(p.pricing_rules) : p.pricing_rules,
        availability: typeof p.availability === 'string' ? JSON.parse(p.availability) : p.availability,
      })),
      note: 'Read-only search. No booking is made until you explicitly confirm.',
    });
  })
);

export default router;
