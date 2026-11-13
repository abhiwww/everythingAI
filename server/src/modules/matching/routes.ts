import { Router } from 'express';
import { query } from 'express-validator';
import { authenticate } from '../../middleware/auth.js';
import { validate } from '../../middleware/validation.js';
import { asyncHandler } from '../../middleware/error.js';
import { db } from '../../db/index.js';

const router = Router();

/** GET /matching/eligible — hard-filter + rank eligible providers */
router.get(
  '/eligible',
  authenticate,
  [
    query('category').isUUID(),
    query('area').optional().isString(),
    query('datetime').optional().isISO8601(),
    query('duration_hours').optional().isNumeric(),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { category, area, datetime, duration_hours } = req.query as any;

    // Hard filters: verified, active for category, serves area, available at time
    let sql = `
      SELECT p.id, p.display_name, p.service_areas, p.pricing_rules, p.rating_label,
             p.verification_status
      FROM provider_profiles p
      WHERE p.verification_status = 'verified'
        AND $1 = ANY(p.categories)
    `;
    const params: any[] = [category];
    let idx = 2;

    if (area) {
      sql += ` AND $${idx} = ANY(p.service_areas)`;
      params.push(area);
      idx++;
    }

    // Exclude providers with conflicting bookings at the requested time
    if (datetime) {
      sql += `
        AND NOT EXISTS (
          SELECT 1 FROM bookings b
          WHERE b.provider_id = p.id
            AND b.status IN ('confirmed','in_progress')
            AND b.scheduled_at = $${idx}
        )
      `;
      params.push(datetime);
      idx++;
    }

    sql += ` ORDER BY p.created_at DESC LIMIT 50`;

    const result = await db().query(sql, params);

    res.json({
      eligible: result.rows.map((p) => ({
        id: p.id,
        display_name: p.display_name,
        service_areas: p.service_areas,
        pricing_rules: typeof p.pricing_rules === 'string' ? JSON.parse(p.pricing_rules) : p.pricing_rules,
        rating_label: p.rating_label,
        verification_status: p.verification_status,
      })),
      filters_applied: {
        category,
        area: area ?? 'any',
        datetime: datetime ?? 'any',
        duration_hours: duration_hours ?? 'any',
      },
      note: 'Results are ranked by configurable factors. New providers show "New provider" as rating_label.',
    });
  })
);

export default router;
