# The Universal Platform — "order anything" as an engine

> This document supersedes the three-category scope in `docs/SCOPE.md`.
> The pilot city, currency, language and safety rules are unchanged.

## 1. The core idea

You do not ship "everything" as a list of categories. You ship an engine that
turns any legal request into the same seven steps:

```
message → category → required details → compliance → estimate → explicit approval → order
```

A new vertical is **one row in a registry**, not a new app:

| Add… | Only needs |
|---|---|
| a new product (gum, TV, sofa) | category entry + provider capability |
| a new service (cook, driver, plumber) | category entry + provider capability |
| a new regulated vertical (alcohol, pharmacy) | category entry + licence rule + integration |

That is why the same chat can handle a ₹20 pack of gum and a ₹5 crore
Lamborghini: the engine never hardcodes the vertical, only the *shape* of the
transaction.

## 2. The pipeline

| Step | Who decides | Where |
|---|---|---|
| 1. Understand the message | deterministic resolver (+ optional LLM phrasing) | `server/src/domain/taxonomy.ts` |
| 2. Pick the category | keyword scoring, no model required | `resolveCategory()` |
| 3. Collect required details | category's `requiredAttributes` | `extractAttributes()` |
| 4. Compliance check | **code, never the model** | `server/src/domain/compliance.ts` |
| 5. Indicative price | category `priceHint` | `estimatePrice()` |
| 6. Explicit approval | customer says YES | `confirmRequest()` |
| 7. Confirmed order | **provider offer accepted** | `acceptOffer()` |

Two guarantees are enforced in code and tested:

1. The assistant never claims a booking before a provider accepts an offer.
2. The assistant never creates anything for a blocked or gated category.

## 3. What a category declares

```ts
{
  slug: 'vehicle_purchase',
  name: 'Vehicle purchase',
  vertical: 'goods',
  providerRole: 'Car / bike dealer',     // what the supply side actually is
  fulfillment: 'handover',               // delivery | onsite | at_provider | remote | handover
  pricing: 'quote',                      // fixed | per_unit | hourly | daily | quote | dynamic
  compliance: 'licensed_service',        // see §5
  licenceType: 'Dealer trade certificate + RC transfer',
  requiredAttributes: [
    { key: 'vehicle', label: 'Which vehicle or model?', type: 'text', required: true },
    { key: 'condition', label: 'New or used?', type: 'enum', options: ['new', 'used'] },
    { key: 'area', label: 'Which Bengaluru area?', type: 'text' }
  ],
  keywords: ['buy a car', 'lamborghini', 'rolls royce', '…'],
  priceHint: { min: 100000, max: 50000000, unit: 'per_job' },
  transactable: true
}
```

The registry currently holds **36 categories** across goods, food, vehicles,
home services, personal services, delivery, rentals, professional work and
planning. Examples: `quick_commerce`, `vehicle_purchase`, `vehicle_rental`,
`cab_ride`, `driver_hire`, `home_cooking`, `general_labour`, `plumbing`,
`pest_control`, `tutoring`, `photography`, `alcohol_delivery`, `pharmacy`,
`security_guard`, `childcare`, `trip_planning`.

## 4. The provider side — "what will you serve?"

A provider is not a category. A provider has **capabilities**:

```
provider_capabilities(provider_id, category_slug, attributes, pricing,
                      capacity_per_day, service_radius_km,
                      licence_type, licence_number, licence_verified)
```

| Your example | Provider role | Capability attributes |
|---|---|---|
| cook | home cook / chef | cuisines, hours, FSSAI registration |
| driver | driver | commercial DL, vehicle classes, hours |
| delivery boy | delivery partner | vehicle type, radius, capacity |
| car dealer | dealer | brands, new/used, trade certificate |
| gun dealer | **not allowed** | blocked before matching (see §5) |
| cleaner | cleaner | deep-clean skills, radius, hours |

One person can hold several capabilities (a driver who also does deliveries).
Matching is then a query over capabilities, not over hardcoded job types.

## 5. Compliance — the part that makes this legal and insurable

Three outcomes, decided in code before anything is created:

| Decision | Meaning | Example |
|---|---|---|
| `allow` | proceed | cleaning, gum, cab, cook |
| `gate` | proceed only after a verifiable condition | alcohol (21+), other cities, licensed partner |
| `block` | never | firearms, narcotics, forged documents |

### Blocked outright (implemented)

Firearms and ammunition, explosives, illegal narcotics, wildlife products,
human organs/trafficking, forged documents, hacking/surveillance of other
people, sexual services, gambling/betting, violence for hire, counterfeit
branded goods, child labour.

> **On the "gun dealer" idea:** this is not squeamishness. Unlicensed sale and
> transfer of firearms is a criminal offence under India's Arms Act, 1959. A
> marketplace that brokers it is the liability, not the dealer. The engine
> recognises the intent, refuses in plain language, records the refusal in
> `compliance_checks`, and creates no request. Legal tools and toys are
> explicitly exempted (`glue gun`, `nail gun`, `toy gun`, `paintball gun`).

### Gated (implemented)

| Category | Gate |
|---|---|
| `alcohol_delivery` | 21+ (Karnataka), excise-licensed retailer, permitted hours |
| `tobacco_delivery` | 21+, licensed retailer, vapes banned in India |
| `pharmacy` | valid prescription + drug licence (Form 20/21) |
| `childcare` | enhanced background checks — not enabled |
| `healthcare` | medical registration + clinical governance — not enabled |
| `security_guard` | PSARA-licensed agency only — not enabled |
| any city ≠ Bengaluru | pilot boundary |

Gated categories are visible in the catalogue, but the concierge explains the
gate instead of pretending to book.

### Labour floor (implemented)

`general_labour` and hourly services enforce:

- a configurable platform floor (`PLATFORM_MIN_HOURLY_INR`, default ₹100/hr) —
  a request like *"a worker for 50 rs per hour"* is **blocked**, not silently
  accepted;
- a maximum single shift of 12 hours.

The floor is a platform policy, not a claim about statutory minimum wages.
Production must load the current Karnataka notification per skill/zone.

### Provider eligibility (implemented)

A provider cannot accept licensed work unless:

1. `verification_status = verified`, and
2. their licence for that category is verified and unexpired.

## 6. Pricing and money

- Every request shows an **indicative estimate** (`is_estimate: true`) derived
  from the category price hint.
- Only a **provider offer** is authoritative.
- No payment, refund, payout or commission code exists in this repo. The
  boundary is deliberate, not forgotten.

## 7. State machines

```
request: draft → collecting_details → awaiting_confirmation → matching
         → quoted → confirmed → fulfilling → completed
         (cancelled / expired / rejected at any legal point)

order:   confirmed → preparing → in_progress → completed
         (cancelled / disputed)
```

The old `bookings` table and state machine still exist for the original
three-category flows; `orders.booking_id` bridges them so a home-service order
can use the vetted booking path.

## 8. API (added in this rebuild)

| Endpoint | Method | Auth | Purpose |
|---|---|---|---|
| `/catalog` | GET | none | list categories (`?vertical=`, `?transactable=true`) |
| `/catalog/resolve?text=` | GET | none | intent + compliance preview |
| `/catalog/:slug` | GET | none | one category definition |
| `/requests` | POST | bearer | create draft / confirmable request |
| `/requests` | GET | bearer | my requests |
| `/requests/:id` | GET | bearer | one request (owner) |
| `/requests/:id/confirm` | POST | bearer | send to providers — **not a booking** |
| `/requests/:id/cancel` | POST | bearer | cancel |
| `/requests/:id/offers` | POST | bearer (provider) | submit an offer |
| `/requests/:id/offers` | GET | bearer | offers on a request |
| `/requests/:id/offers/:offerId/accept` | POST | bearer | accept → creates confirmed order |
| `/orders` | GET | bearer | my orders |
| `/orders/:id` | GET | bearer | one order (customer/provider/staff) |
| `/orders/:id/status` | POST | bearer (provider/staff) | fulfilment transition |

`POST /requests` returns `missing[]` instead of silently proceeding, and
`409`/`422` with a compliance message for gated/blocked categories.

## 9. Chat examples (verified against the running server)

| You say | The concierge does |
|---|---|
| "I want to order a pack of gum" | asks for item + area, then drafts an order |
| "a cook for 3 hours at home" | asks cuisine + area, drafts a home-cook request |
| "a Lamborghini" | resolves vehicle purchase, asks new/used + area |
| "my sink is leaking" | resolves plumbing, asks area |
| "find me a gun dealer" | refuses, cites the Arms Act, creates nothing |
| "order two beers" | explains 21+ and excise-licence gate |
| "a worker for 50 rs per hour" | refuses below the platform floor |
| "a babysitter for 4 hours" | explains enhanced checks are not live |

## 10. What is built vs. what is next

**Built and tested (94 server tests):**

- 36-category registry + deterministic resolver
- slot filling, estimates, request/order state machines
- compliance engine (block/gate/allow) + provider eligibility + audit table
- request, offer, order APIs
- chat concierge with explicit approval, wired to the universal engine
- migration `002_universal_platform.sql` and `npm run seed:categories`

**Next (in order):**

1. Dynamic cards in the mobile/web chat for `needs_details`, `request_draft`,
   `request_sent` (the API already returns them).
2. Provider capability onboarding + licence upload/review.
3. Real matching across capabilities (radius, capacity, calendar).
4. Offers UI on both sides.
5. Merchant/fleet adapters per vertical (food, grocery, cabs).
6. Payments only after the order lifecycle is stable.

## 11. Operator commands

```powershell
# apply the new schema
$env:PGPASSWORD='everyday'
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -h 127.0.0.1 -p 5432 -U everyday `
  -d everyday_ai -f "C:\Users\abhi laptop\Desktop\everything ai\migrations\002_universal_platform.sql"

# load / refresh the 36 categories
cd "C:\Users\abhi laptop\Desktop\everything ai\server"
npm run seed:categories
```

Status: demo mode, Bengaluru only, no payments, no real fulfilment. Every AI
reply is labelled as such.
