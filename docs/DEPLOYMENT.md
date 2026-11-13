# Deployment — Everyday AI Concierge MVP

## Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Redis 7+
- Docker (optional, for containerised deployment)

## Environment variables (.env.example)
Copy `.env.example` to `.env` and fill in values. **Never commit real secrets.**

```
# App
NODE_ENV=development
PORT=4000
API_BASE_URL=http://localhost:4000
WEB_BASE_URL=http://localhost:3000

# Auth
JWT_ACCESS_SECRET=change-me-in-production
JWT_REFRESH_SECRET=change-me-in-production
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=7d

# Database
DATABASE_URL=postgresql://everyday:everyday@localhost:5432/everyday_ai

# Redis / queue
REDIS_URL=redis://localhost:6379

# AI (provider-agnostic)
AI_PROVIDER=stub        # stub | openai | anthropic | azure
AI_API_KEY=             # only required for real provider
AI_MODEL=gpt-4o-mini
AI_TEMPERATURE=0.2
AI_TIMEOUT_MS=10000
AI_ENABLED=false        # set true only with real credentials

# Notifications (enabled only with real credentials + consent)
NOTIFICATION_PROVIDER=stub   # stub | smtp | twilio | msg91
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
MSG91_AUTH_KEY=

# File storage
STORAGE_PROVIDER=local   # local | s3
STORAGE_BUCKET=
STORAGE_REGION=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=

# Feature flags (demo)
FEATURE_CLEANING=true
FEATURE_DRIVING=true
FEATURE_GARDENING=true
FEATURE_PAYMENTS=false
FEATURE_VOICE=false
FEATURE_TRAVEL=true

# Pilot config
PILOT_CITY=Bengaluru
PILOT_AREAS=Indiranagar,Koramangala,HSR Layout,Whiteboard
CURRENCY=INR
TIMEZONE=Asia/Kolkata
```

## Setup commands
```bash
# 1. Install backend dependencies
cd server
npm install

# 2. Install frontend dependencies
cd ../web
npm install

# 3. Set up database (PostgreSQL)
createdb everyday_ai
psql -d everyday_ai -f server/migrations/001_initial.sql

# 4. Seed demo data (labelled, dev only)
cd server
npm run seed:demo

# 5. Run backend (dev)
cd server
npm run dev

# 6. Run frontend (dev)
cd ../web
npm run dev

# Backend: http://localhost:4000
# Frontend: http://localhost:3000
```

## Docker (optional)
```bash
docker-compose up -d
```

## External credentials / partnerships required for production
None are implemented or assumed in the MVP. Before pilot, obtain:
1. **Real notification provider** (email/SMS/WhatsApp) with credentials and customer consent.
2. **Real provider onboarding process** — document review, identity checks, renewal, disputes, audit trail (define with legal/operations advisers).
3. **Legal review** — DPDP, consumer protection, labour, tax (India) with qualified counsel.
4. **Payment partner** (UPI / authorised aggregator) — only when payments are added; not part of MVP.
5. **Map/merchant integrations** — only when travel/ordering features are activated.

## What works now vs simulated
| Component | Works now | Simulated / placeholder |
|---|---|---|
| Chat + message history | ✅ | |
| Service request understanding | ✅ (stub AI when credentials absent) | Real AI when AI_ENABLED=true |
| Provider discovery | ✅ (from database) | |
| Quotes + confirmation | ✅ | |
| Booking state machine | ✅ | |
| Provider accept/decline | ✅ | |
| Admin dashboard + audit | ✅ | |
| Payments | ❌ | Placeholder interface only |
| Real notifications | ❌ | Stub provider |
| Voice / regional languages | ❌ | Disabled |
| Live maps / travel data | ❌ | Labelled as unverified |

## Known limitations & next steps
- Payments not implemented (future decision, not MVP)
- No real notification delivery (stub only)
- No live geospatial/traffic/weather data
- Single-city Bengaluru pilot only
- English only
- Provider verification process needs legal/operations definition
