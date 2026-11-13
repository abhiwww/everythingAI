# MVP Implementation Plan: Everyday AI Concierge

## Overview
Production-minded MVP of an AI-powered service marketplace and personal assistant for Bengaluru neighbourhoods. Core: customer chat, provider portal, admin console, booking state machine, AI orchestration with guardrails, explicit user approval before any consequential action.

## Architecture Decisions
- Backend: Node.js + Express + TypeScript (monolith)
- Database: PostgreSQL (migrations provided); in-memory mock for dev/demo
- AI: provider-agnostic with deterministic fallback when credentials absent
- Web frontend: Next.js 14 + React + TypeScript + Tailwind
- **Mobile app: React Native + Expo SDK 50 + TypeScript (shares backend API)**
- Payments: NOT implemented (placeholder boundary only)
- Deployment: Docker + docker-compose for web; EAS builds for mobile

## Task List

### Phase 1: Foundation & Documentation ✅ COMPLETE
- [x] Task 1: Repo structure, README, docs (PRD, scope, architecture, data model, API contract, security, AI guardrails, deployment)
- [x] Task 2: Database schema + SQL migrations (20 tables)

### Phase 2: Backend Core ✅ COMPLETE
- [x] Task 3: Identity & access (auth, sessions, roles, permissions, /me)
- [x] Task 4: Chat & conversation (conversations, messages, consent, workflow context)
- [x] Task 5: Service catalogue & provider management (categories, profiles, verification, service areas, availability)
- [x] Task 6: Matching & pricing (eligible-provider filtering, ranking, quotes, expiration)
- [x] Task 7: Bookings module (state machine, transitions, idempotency, accept/decline, audit trail)

### Checkpoint: Backend Core ✅
- [x] TypeScript compiles clean
- [x] Booking state machine verified
- [x] 24+ backend tests passing

### Phase 3: AI Orchestration & Guardrails ✅ COMPLETE
- [x] Task 8: AI orchestration layer (intent classification, field extraction, follow-ups, tool schemas, authorization enforcement)
- [x] Task 9: Deterministic demo/fallback mode when AI credentials absent
- [x] Task 10: Integration gateway placeholder

### Phase 4: Web Frontend ✅ COMPLETE
- [x] Task 11: Customer chat UI
- [x] Task 12: Provider portal
- [x] Task 13: Admin console

### Phase 5: Mobile App (React Native) ✅ COMPLETE
- [x] Task 14: Expo + React Native scaffold (package.json, App.json, tsconfig)
- [x] Task 15: API client sharing backend endpoints
- [x] Task 16: Auth context with AsyncStorage persistence
- [x] Task 17: Navigation (stack + tabs, auth-gated)
- [x] Task 18: Sign in / Register screen
- [x] Task 19: Chat screen (service cards, confirmation cards, status cards, suggestions)
- [x] Task 20: Bookings list screen (customer)
- [x] Task 21: Provider job requests screen (accept/decline)
- [x] Task 22: Admin console screen (provider verification, audit trail)
- [x] Task 23: TypeScript compiles clean (tsc --noEmit)

### Phase 6: Tests & Safety ✅ COMPLETE
- [x] Task 24: Backend tests — 31 tests across 5 suites, all passing
- [x] Task 25: Security & privacy (rate limiting, access control, audit logging, demo data labelled)
- [x] Task 26: Setup commands, env examples, deployment notes, Docker, limitations/roadmap

### Checkpoint: Complete ✅
- [x] All acceptance criteria from prompt section 14 addressed
- [x] Ready for controlled pilot (with real provider onboarding and legal review)

## How to Start

### Backend (API)
```powershell
cd "C:\Users\abhi laptop\Desktop\everything ai\server"
npm install
npm run dev   # http://localhost:4000
```

### Web Frontend
```powershell
cd "C:\Users\abhi laptop\Desktop\everything ai\web"
npm install
npm run dev   # http://localhost:3000
```

### Mobile App (React Native + Expo)
```powershell
cd "C:\Users\abhi laptop\Desktop\everything ai\mobile"
npm install
npm start     # Expo dev server
# Then press 'a' for Android emulator, 'i' for iOS simulator
```

### Full Stack with Docker (web only)
```powershell
cd "C:\Users\abhi laptop\Desktop\everything ai"
docker-compose up --build
```

## Mobile App Details
- Connects to backend at `http://10.0.2.2:4000/api/v1` (Android emulator localhost)
- Set `EXPO_PUBLIC_API_BASE_URL` env var for production builds
- Screens: Sign in, Chat, Bookings, Provider Job Requests, Admin Console
- Demo mode enabled by default (sample data, no real bookings/payments)
- TypeScript compiles cleanly

## Test Results
- Backend: 5 test suites, 31 tests, all passing
- Mobile: TypeScript compiles clean (tsc --noEmit)
- Web: TypeScript compiles clean (tsc --noEmit)

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| AI hallucinating confirmations | Critical | Backend enforces authorization/confirmation; AI never triggers privileged actions |
| Fake payment claims | High | Payments explicitly not implemented; placeholder boundary only |
| Provider double-booking | Critical | Database transactions + idempotency keys + atomic transitions |

## Open Questions
- Which notification provider (email/SMS/WhatsApp) for the pilot?
- Legal counsel review timeline for DPDP and labour law compliance?
- Real provider onboarding process definition (document review, identity checks)?

---

# Phase 2 — Universal Engine ("order anything")

Status: **backend complete and tested**, UI cards pending.

## Delivered
- [x] `migrations/002_universal_platform.sql` — categories, provider_capabilities,
      requests, request_offers, orders, order_events, compliance_checks (applied locally)
- [x] `server/src/domain/taxonomy.ts` — 36-category registry + deterministic resolver
- [x] `server/src/domain/compliance.ts` — block / gate / allow engine + provider eligibility
- [x] `server/src/domain/request-flow.ts` — slot filling, estimates, state machines
- [x] `server/src/modules/requests/service.ts` — create / confirm / cancel / offer / accept / advance
- [x] API: `/catalog`, `/catalog/resolve`, `/requests`, `/requests/:id/offers`, `/orders`
- [x] Chat concierge rewritten: any legal category, explicit approval, no false bookings
- [x] `npm run seed:categories` (36 categories loaded into Postgres)
- [x] Tests: 94 passing across 9 suites (was 31)
- [x] `docs/UNIVERSAL_PLATFORM.md`

## Decisions locked
- Firearms, narcotics, forged documents, organs, sexual services, gambling,
  violence-for-hire, counterfeit goods and child labour are **blocked in code**.
- Alcohol / tobacco / pharmacy / childcare / healthcare / security are **gated**
  — visible in the catalogue but not bookable without licence + verification.
- Labour has a platform hourly floor (₹100 default) and a 12-hour shift cap.
- Estimates are never presented as final prices; only a provider offer is.

## Next
- [ ] Mobile + web card components for `needs_details`, `request_draft`, `request_sent`
- [ ] Provider capability onboarding UI + licence upload/review
- [ ] Capability-based matching (radius, capacity, calendar)
- [ ] Offers UI on customer and provider sides
- [ ] Vertical adapters (food, grocery, cabs) behind feature flags
- [ ] Payments only after the order lifecycle is stable
