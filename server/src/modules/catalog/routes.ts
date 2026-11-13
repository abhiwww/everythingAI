/**
 * Universal catalogue API.
 *
 * GET /catalog              — every category the engine knows about
 * GET /catalog/resolve?text — deterministic intent resolution + compliance
 * GET /catalog/:slug        — one category definition
 */

import { Router } from 'express';
import { query as queryValidator } from 'express-validator';
import { validate } from '../../middleware/validation.js';
import { asyncHandler } from '../../middleware/error.js';
import {
  CATEGORIES,
  categoryToJson,
  getCategory,
  resolveCategory,
} from '../../domain/taxonomy.js';
import { checkCompliance, complianceProfileLabel } from '../../domain/compliance.js';

const router = Router();

/** GET /catalog — list categories */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const vertical = typeof req.query.vertical === 'string' ? req.query.vertical : null;
    const onlyTransactable = req.query.transactable === 'true';

    let items = CATEGORIES;
    if (vertical) items = items.filter((c) => c.vertical === vertical);
    if (onlyTransactable) items = items.filter((c) => c.transactable);

    res.json({
      count: items.length,
      categories: items.map((c) => ({
        ...categoryToJson(c),
        compliance_label: complianceProfileLabel(c.compliance),
      })),
      notice: 'Demo catalogue — every entry is a definition, not live merchant inventory.',
    });
  })
);

/** GET /catalog/resolve?text=... — what does this message mean? */
router.get(
  '/resolve',
  [queryValidator('text').isString().notEmpty().trim()],
  validate,
  asyncHandler(async (req, res) => {
    const text = String(req.query.text);
    const resolution = resolveCategory(text);

    if (!resolution.category) {
      res.json({
        resolution: {
          category: null,
          confidence: resolution.confidence,
          matched_keywords: resolution.matchedKeywords,
          alternatives: [],
        },
        compliance: checkCompliance({ text, category: null }),
        suggestions: CATEGORIES.filter((c) => c.transactable)
          .slice(0, 8)
          .map((c) => ({ slug: c.slug, name: c.name, example: c.examples[0] })),
      });
      return;
    }

    res.json({
      resolution: {
        category: categoryToJson(resolution.category),
        confidence: resolution.confidence,
        matched_keywords: resolution.matchedKeywords,
        alternatives: resolution.alternatives.map((c) => ({ slug: c.slug, name: c.name })),
      },
      compliance: checkCompliance({ text, category: resolution.category }),
    });
  })
);

/** GET /catalog/:slug */
router.get(
  '/:slug',
  asyncHandler(async (req, res) => {
    const category = getCategory(req.params.slug);
    if (!category) {
      res.status(404).json({ error: 'not_found', message: 'Unknown category' });
      return;
    }
    res.json({
      category: {
        ...categoryToJson(category),
        compliance_label: complianceProfileLabel(category.compliance),
      },
    });
  })
);

export default router;
