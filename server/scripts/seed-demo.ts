/**
 * Demo seed script.
 * Populates the in-memory / dev database with visibly labelled sample data.
 * NEVER run this against production. Data is labelled "Demo data — not real".
 */

import { db } from '../src/db/index.js';
import { config } from '../src/config.js';
import { v4 as uuidv4 } from 'uuid';

const DEMO_NOTICE = 'Demo data — not real. Not for production.';

async function main() {
  console.log('Seeding demo data...');
  console.log(DEMO_NOTICE);

  // Service categories
  const cleaningId = uuidv4();
  const drivingId = uuidv4();
  const gardeningId = uuidv4();

  await db().query(
    `INSERT INTO service_categories (id, name, slug, description, is_active, requires_verification, min_age)
     VALUES ($1,'Cleaning','cleaning','Home cleaning services',true,false,NULL),
            ($2,'Driving','driving','Driver hire by hour or day',true,false,NULL),
            ($3,'Gardening','gardening','Gardening and general household help',true,false,NULL)
     ON CONFLICT (slug) DO NOTHING`,
    [cleaningId, drivingId, gardeningId]
  );

  // Demo addresses
  const addrId = uuidv4();
  await db().query(
    `INSERT INTO addresses (id, user_id, label, street, area, city, pincode, is_default)
     VALUES ($1,'demo-customer-1','Home','123 Main Street','Indiranagar','Bengaluru','560038',true)
     ON CONFLICT DO NOTHING`,
    [addrId]
  );

  // Demo providers (visibly labelled)
  const providers = [
    { id: uuidv4(), name: 'Ravi Kumar — Cleaning', category: cleaningId, areas: ['Indiranagar','Koramangala'], rate: 10000 },
    { id: uuidv4(), name: 'Sunita Rao — Driving', category: drivingId, areas: ['Indiranagar','Whitefield'], rate: 10000 },
    { id: uuidv4(), name: 'Mohan Singh — Gardening', category: gardeningId, areas: ['HSR Layout','Indiranagar'], rate: 10000 },
  ];

  for (const p of providers) {
    await db().query(
      `INSERT INTO provider_profiles (id, user_id, display_name, categories, service_areas, languages, pricing_rules, availability, verification_status, rating_label)
       VALUES ($1,'demo-provider-1',$2,ARRAY[$3]::uuid[],ARRAY[$4,$5]::text[],ARRAY['English','Kannada']::text[],
               $6,'{}','verified',$7)
       ON CONFLICT DO NOTHING`,
      [p.id, `Demo provider — ${p.name}`, p.category, p.areas[0], p.areas[1],
       JSON.stringify({ hourly_rate_paise: p.rate, minimum_callout_paise: p.rate }),
       'Demo provider — new']
    );
  }

  console.log('Demo seed complete.');
  console.log('Categories: Cleaning, Driving, Gardening');
  console.log('Providers: 3 demo providers (verified, sample data)');
  console.log(DEMO_NOTICE);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
