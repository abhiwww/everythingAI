import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/error.js';
import { db } from '../../db/index.js';

const router = Router();

/** GET /services — list active service categories */
router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const result = await db().query(
      'SELECT id, name, slug, description, is_active, requires_verification, min_age FROM service_categories WHERE is_active = true ORDER BY name'
    );
    res.json({ services: result.rows });
  })
);

export default router;
