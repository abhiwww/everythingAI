/**
 * Seeds the universal category registry from `src/domain/taxonomy.ts`.
 * Safe to re-run: existing categories are updated in place.
 *
 * Usage: npm run seed:categories
 */

import 'dotenv/config';
import { db } from '../src/db/index.js';
import { CATEGORIES } from '../src/domain/taxonomy.js';

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set — the category registry needs PostgreSQL.');
    process.exit(1);
  }

  console.log(`Seeding ${CATEGORIES.length} categories...`);

  for (const c of CATEGORIES) {
    await db().query(
      `INSERT INTO categories
        (slug, name, vertical, description, provider_role, fulfillment, pricing, compliance,
         min_age, licence_type, required_attributes, optional_attributes, keywords, examples,
         price_hint, is_transactable, legal_note)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12::jsonb,$13,$14,$15::jsonb,$16,$17)
       ON CONFLICT (slug) DO UPDATE SET
         name = EXCLUDED.name,
         vertical = EXCLUDED.vertical,
         description = EXCLUDED.description,
         provider_role = EXCLUDED.provider_role,
         fulfillment = EXCLUDED.fulfillment,
         pricing = EXCLUDED.pricing,
         compliance = EXCLUDED.compliance,
         min_age = EXCLUDED.min_age,
         licence_type = EXCLUDED.licence_type,
         required_attributes = EXCLUDED.required_attributes,
         optional_attributes = EXCLUDED.optional_attributes,
         keywords = EXCLUDED.keywords,
         examples = EXCLUDED.examples,
         price_hint = EXCLUDED.price_hint,
         is_transactable = EXCLUDED.is_transactable,
         legal_note = EXCLUDED.legal_note,
         updated_at = now()`,
      [
        c.slug,
        c.name,
        c.vertical,
        c.description,
        c.providerRole,
        c.fulfillment,
        c.pricing,
        c.compliance,
        c.minAge ?? null,
        c.licenceType ?? null,
        JSON.stringify(c.requiredAttributes),
        JSON.stringify(c.optionalAttributes ?? []),
        c.keywords,
        c.examples,
        JSON.stringify(c.priceHint),
        c.transactable,
        c.legalNote ?? null,
      ]
    );
  }

  console.log(`Done. ${CATEGORIES.length} categories in the registry.`);
}

main().catch((err) => {
  console.error('Category seed failed:', err);
  process.exit(1);
});
