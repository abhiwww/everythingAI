# Product Requirements Document — Everyday AI Concierge (Bengaluru Pilot)

**Status**: Approved for controlled pilot development (MVP)  
**Author**: Product (AI-assisted draft, reviewed by project owner)  
**Last Updated**: 2026-11-08  
**Version**: 1.1 (pilot-focused)  
**Stakeholders**: Founder/Product, Engineering, Design, Operations, Support, Legal counsel (pre-launch)

---

## 1. Problem Statement

People in Bengaluru often need small, time-sensitive local help (cleaning, a driver, gardening/household assistance) but face friction: finding a trustworthy provider, explaining needs, comparing availability/pricing, and coordinating follow-through. Existing options can feel fragmented, opaque, or high-effort for everyday tasks.

**Who experiences it**: Urban customers in selected Bengaluru neighbourhoods who want fast, understandable help without negotiating across multiple channels.

**Cost of not solving**: Wasted time, delayed chores, low trust in informal matching, and no clear accountability when coordination fails.

**Evidence (pilot assumptions to validate)**
- **User research**: *To be collected during pilot* (target n≥10 problem interviews before expanding scope).
- **Behavioral data**: *Instrument in pilot* (time-to-request, completion rate, drop-off after quote).
- **Support signal**: *Capture unsupported requests and coordination failures as tagged tickets*.
- **Competitive signal**: Local service discovery exists, but the MVP differentiates on a **single chat-first coordinator** with **explicit approval** and **honest status**.

---

## 2. Goals & Success Metrics

| Goal | Metric | Baseline | Target (pilot window) | Measurement Window |
|---|---|---:|---:|---|
| Prove end-to-end coordination for supported services | % supported requests reaching `confirmed` or honest terminal outcome | 0 (pre-pilot) | ≥60% in controlled cohort | 30 days post-pilot start |
| Build trust through transparency | % bookings where customer saw price/timing/address/terms before submit | N/A | 100% (product invariant) | Continuous |
| Reduce coordination ambiguity | Support tickets tagged "status confusion" per 50 bookings | N/A | <5 | 60 days |
| Validate provider workflow | Median provider response time for `provider_pending` | N/A | <15 min (ops-assisted if needed) | 30 days |
| Safety & honesty | Incidents of false confirmation/ordering/payment claims | 0 | 0 | Continuous |

**North Star (pilot)**: *Successful, honestly-reported service coordinations per week* in supported categories within pilot areas.

---

## 3. Non-Goals (this iteration)

- **Payments, refunds, payouts, commissions** — placeholder boundary only.
- **Real snack/grocery/merchant ordering** — no live orders.
- **Voice input, Kannada/regional languages** — disabled/placeholder.
- **High-risk/regulated categories**: conversation companions, babysitting, security/bodyguards, engineering, doctors — not offered.
- **Statewide/national expansion** — **Bengaluru selected neighbourhoods only**.
- **Live maps/traffic/weather/availability claims** — planning suggestions must be labelled unverified.
- **Advanced autonomous agents** — human ops fallback is part of MVP.

---

## 4. User Personas & Core Stories

### Primary persona — Customer (Riya)
Riya lives in Indiranagar, works full-time, and needs reliable help on short notice. She wants clear pricing and to stay in control.

**Story C1**: As a customer, I want to describe my need in plain language so that I can get help without filling complex forms.  
**Acceptance Criteria**
- [ ] Given a text message, when I send it, then the assistant responds with clarifying questions or eligible options within a reasonable time (or a clear error).
- [ ] Given an unsupported request, when detected, then I see: "We don't offer this yet. Would you like to request it or speak to support?" (or equivalent).
- [ ] Accessibility: input and messages are keyboard reachable; status/loading announced appropriately.

**Story C2**: As a customer, I want to see eligible providers/quotes with transparent details so that I can decide.  
**Acceptance Criteria**
- [ ] Given matches exist, when shown, then I see provider/service, area, indicative/quoted price (INR), timing, address context, and conditions.
- [ ] Given no matches, when searched, then I see an honest no-results message and next steps (try different time/area/support).
- [ ] Demo data is visibly labelled.

**Story C3**: As a customer, I want to explicitly confirm before a booking request is sent so that nothing happens without my approval.  
**Acceptance Criteria**
- [ ] Given a quote, when I have not confirmed, then no `provider_pending` booking is created.
- [ ] Given I confirm, when submitted, then the request is idempotent and status becomes `provider_pending` (or honest failure).
- [ ] I can view current status and history.

### Provider (Suresh)
Local service provider who wants clear requests and control over accepting jobs.

**Story P1**: As a provider, I want to accept or decline requests so that I only commit to jobs I can do.  
**Acceptance Criteria**
- [ ] Given a `provider_pending` request, when I accept, then status becomes `confirmed` atomically (no double-accept).
- [ ] Given I decline or another provider/system resolves it, when I act late, then I receive a conflict/clear message.

### Operations/Admin/Support
**Story O1**: As staff, I want to review verification, manage requests, and inspect audit trails so that the pilot can be run safely.  
**Acceptance Criteria**
- [ ] Role-based access enforced; audit log records key actions/transitions.

---

## 5. Solution Overview

A **conversation-first web app** (Next.js) backed by an **Express/TypeScript API** with PostgreSQL/Redis. The assistant gathers intent/details, performs **read-only discovery** against the platform database, and prepares quotes. A **booking state machine** enforces lifecycle and authorization; providers accept/decline; customers see honest statuses. Unsupported/high-risk requests are refused with safe alternatives. Payments and real merchant integrations are **not** live.

**Key design decisions**
- **Backend authoritative over AI**: tools/actions validated server-side; AI cannot confirm bookings or claim completion.
- **Explicit confirmation gate**: booking submission requires `confirmation=true` and idempotent handling.
- **Bengaluru pilot constraint**: English, INR, IST, selected areas; feature flags for categories.
- **Honest demo mode**: sample data labelled; no claims of real availability when not verified.

---

## 6. Technical Considerations

**Architecture**: Web + API + Postgres + Redis; optional Docker Compose. State machine: `server/src/modules/bookings/state-machine.ts` (design spec: `docs/BOOKING_STATE_MACHINE.md`).

**Dependencies / risks**

| Risk | Likelihood | Impact | Mitigation |
|---|---:|---:|---|
| Provider no-response | Med | High | Timeout/expiry job, ops fallback, clear customer messaging |
| Race conditions on accept | Med | High | Atomic conditional updates + idempotency |
| AI hallucinated claims | Med | High | Deterministic status from DB; UI labels; policy prompts; backend enforcement |
| Privacy/compliance (DPDP, etc.) | Med | High | Access control, minimal data, legal review before launch |
| Demo data mistaken for real | Med | Med | Visible "Demo mode" labels everywhere relevant |

**Open questions (resolve before wider pilot)**
- [ ] Provider verification/renewal/dispute process — Owner: Ops/Legal — Deadline: before pilot expansion.
- [ ] Notification provider + consent flows — Owner: Product/Eng — Deadline: before relying on notifications.
- [ ] Timeout policy (minutes vs schedule-aware) — Owner: Eng/Ops — Deadline: MVP hardening.

---

## 7. Pilot Launch Plan

| Phase | Audience | Success Gate |
|---|---|---|
| Internal alpha | Team + seeded demo data | Core flows work; no false confirmations; basic a11y pass |
| Controlled pilot | Selected Bengaluru users/providers (invited) | Metrics tracked; support path works; audit/roles verified |
| Expand pilot | More areas/providers in Bengaluru | Targets in §2 trending positively; legal/ops sign-off |

**Rollback criteria**: Any false confirmation/booking/payment claim, critical security issue, or inability to access accurate status/audit → pause pilot and remediate.

---

## 8. Appendix / References

- `README.md` — setup and status
- `docs/SCOPE.md` — in/out scope and acceptance criteria
- `docs/BOOKING_STATE_MACHINE.md` — state machine design
- `docs/ARCHITECTURE.md`, `docs/API_CONTRACT.md`, `docs/SECURITY_AND_PRIVACY.md`, `docs/DEPLOYMENT.md`
- `migrations/001_initial.sql` — schema baseline

---
**PRD principle**: *If the system cannot confirm it, the product must not claim it.*