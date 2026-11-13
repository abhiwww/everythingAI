# Everyday AI Concierge — MVP

An AI-powered service marketplace and personal assistant for everyday users in Bengaluru, Karnataka.

## Working title
Everyday AI Concierge

## Initial market
Selected neighbourhoods in Bengaluru, Karnataka, India.

## Long-term vision
Expand across Karnataka, India, and eventually internationally after proving the model.

## MVP status
**Development phase — not ready for production.** This is a pilot-grade MVP built for a controlled Bengaluru neighbourhood pilot. Payments, real ordering, voice, regional languages, and regulated/high-risk categories (healthcare, security, childcare) are deliberately NOT implemented.

## Core promise
One clean chat screen. A customer writes in ordinary language ("I need my bathroom cleaned today"), the platform understands the request, asks follow-up questions, finds actual eligible providers, and helps coordinate — but never books, orders, or pays without the customer's explicit approval.

## Repository structure
```
.
├── README.md
├── tasks/                # Implementation plan and task list
├── docs/                 # Product requirements, scope, architecture, API contract, security
├── server/               # Backend API (Node.js, Express, TypeScript)
├── web/                  # Frontend (Next.js, React, TypeScript)
└── .env.example          # Environment variable examples (no real secrets)
```

## Getting started (development)
See `docs/DEPLOYMENT.md` for setup commands, environment variables, and deployment notes.

## What works now
- Customer chat with message history and loading states
- Service request understanding and follow-up questions
- Provider discovery from the platform database (cleaning, drivers, gardening/general household help)
- Transparent quotes and explicit customer confirmation before any booking request
- Provider accept/decline workflow with booking status
- Simple provider portal and admin dashboard
- Manual operations fallback for unfulfillable requests
- Reviews, support contact, cancellation requests, basic incident reporting
- Planning-only travel suggestions (clearly labelled)

## What is simulated / not implemented
- Payments, refunds, payouts, platform commissions — placeholder boundary only
- Real merchant integrations (snack/grocery ordering) — not connected
- Voice input, Kannada and regional languages — disabled placeholder
- Conversation companions, babysitting, security, engineering, doctors — not offered
- Live maps/traffic/weather/availability data — labelled as unverified suggestions
- Real notification providers — enabled only with real credentials and consent

## Acceptance criteria (pilot readiness)
See `docs/SCOPE.md` and Section 14 of the project prompt. The MVP is pilot-ready only when:
1. A customer can describe a supported service, provide missing details, and see actual eligible providers or an honest no-results message.
2. A customer sees price, timing, address, and conditions before explicitly requesting a booking.
3. A booking is not shown as confirmed until an authorised provider accepts.
4. Provider accept/decline handles concurrency safely (no double-booking).
5. Customer and provider can view accurate current status and booking history.
6. An admin can review provider verification, manage requests, and inspect an audit trail.
7. Unsupported services and unavailable integrations are clearly disclosed; no fake ordering or payments.
8. AI cannot bypass backend authorization or confirmation.
9. Errors, cancellations, timeouts, and support escalation work and are tested.
10. Private data is access-controlled; basic logging, backups, and incident process exist.
11. Demo data is visibly labelled; no claims of real provider availability in demo mode.

## License
Internal project — not legal advice. Review applicable Indian privacy, consumer protection, labour, tax, and sector-specific laws (including DPDP) with qualified counsel before launch.