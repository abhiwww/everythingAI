# Architecture — Everyday AI Concierge MVP

## 1. Recommended starting architecture
**Modular monolith + asynchronous worker.** Easier to build and operate for a pilot, with clear interfaces for future separation.

| Layer | Technology (suggested default) | Notes |
|---|---|---|
| Frontend | Next.js / React / TypeScript | Responsive, mobile-first |
| Backend API | Node.js / Express / TypeScript | Well-structured modules |
| Database | PostgreSQL | Transactional data |
| Geospatial | PostGIS | When justified |
| Queue / cache | Redis | Job queue; NOT authoritative booking record |
| AI | Provider-agnostic interface | Structured outputs, tool calling, timeouts, fallback |
| File storage | Private object storage | Short-lived URLs, malware/type checks |
| Notifications | Pluggable email/SMS/WhatsApp | Only with real credentials + consent |
| Deployment | Containerised | Dev / staging / prod |

These are suggested defaults, not mandatory. Describe trade-offs before changing them. Never expose secrets to the browser or commit them to the repository.

## 2. Logical backend modules
1. Identity and access — authentication, sessions, roles, permissions
2. Chat and conversation — messages, sessions, consent, summaries, linked workflow state
3. AI orchestration — intent classification, missing-info detection, tool invocation, response generation
4. Service catalogue — categories, service definitions, area coverage, policy flags
5. Provider management — profile, verification, skills, service areas, availability
6. Matching and pricing — eligible-provider filtering, ranking, quote generation, expiration
7. Bookings — authoritative records, status transitions, expiry, provider responses, history
8. Notifications — queue-backed delivery, retries, templates, delivery status
9. Support and safety — tickets, incidents, escalation, moderation
10. Admin and analytics — dashboards, feature flags, reporting, audit logs
11. Integration gateway — optional connectors (maps, retailers) with permissions and capability checks
12. Future payments interface — placeholder domain boundary only; no fake capture, wallet, escrow, or payout

## 3. AI orchestration flow
1. Receive customer message + authenticated session context
2. Apply safety, policy, and rate-limit checks
3. Classify intent: local service / planning / order / support / unsupported / other
4. Extract structured fields with confidence and source
5. Ask follow-up questions where required (no silent material assumptions)
6. Invoke approved read-only tools (catalogue lookup, provider search)
7. Validate tool results; present real options and uncertainty in plain language
8. Generate action preview from authoritative data — NOT model free text
9. Require correct confirmation; record consent, quote version, selected action
10. Execute via deterministic backend command (authorization, validation, idempotency, audit logging)
11. Report status only from authoritative system; hand off to support on failure
12. Use structured output schemas; model is probabilistic and untrusted

## 4. Booking state machine
```
draft → quote_ready → customer_approved → provider_pending → confirmed → in_progress → completed
```
Additional states: `provider_declined`, `expired`, `cancel_requested`, `cancelled`, `disputed`, `failed`.

- Define allowed transitions and role permissions centrally.
- Database transactions + concurrency control (no double-acceptance / double booking).
- Idempotency keys on state-changing requests.
- Append-only status history (actor, timestamp, reason).
- Renewed customer approval if price, provider, or time changes materially.
- Provider-response timeouts; communicate failures explicitly.

## 5. Matching logic
Hard filters before ranking:
- Active provider, approved for category, not suspended, documents current when required
- Serves requested location and time; availability checked against existing bookings
- Meets language, equipment, or other essential customer requirements

Ranking factors (transparent, configurable): distance, availability, price, service quality, provider preferences.
- No invented ratings; display "New provider" where applicable.
- Log why each result was included/excluded (not sensitive ranking details).
- Avoid discriminatory proxies; review outcomes for fairness.

## 6. Core data entities
User, role, session, consent, address; Conversation, message, workflow context; Provider profile, category, service area, availability, document reference, verification decision; Service category, pricing rule, quote/version; Service request, booking, booking event, provider response, cancellation; Review, support ticket, incident, notification; Admin audit event, feature flag; Future integration/transaction references (no card credentials).

Use UUIDs/non-guessable IDs, timestamps, indexes, foreign keys, retention rules. Separate sensitive identity documents from ordinary profile data.