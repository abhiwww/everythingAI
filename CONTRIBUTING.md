# Contributing — Everyday AI Concierge

This is a monorepo: `server/` (Express + TypeScript API), `mobile/` (Expo /
React Native), `web/` (Next.js), plus `migrations/`, `docs/` and `tasks/`.

Read `docs/UNIVERSAL_PLATFORM.md` before touching the engine. The product rule
that outranks everything else: **never claim a booking, payment, verification or
completion unless the backend has a record of it.**

---

## 1. One-time setup

```powershell
git clone <repo-url>
cd "everything ai"

# Server
cd server
npm ci
Copy-Item .env.example .env          # then set DATABASE_URL / JWT secrets
npm run dev                          # http://localhost:4000

# Database (first time only)
$env:PGPASSWORD='everyday'
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -h 127.0.0.1 -U everyday -d everyday_ai `
  -f "..\migrations\001_initial.sql"
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -h 127.0.0.1 -U everyday -d everyday_ai `
  -f "..\migrations\002_universal_platform.sql"
npm run seed:categories

# Mobile
cd ..\mobile
npm ci
Copy-Item .env.example .env          # EXPO_PUBLIC_API_BASE_URL=http://<your-LAN-IP>:4000/api/v1
$env:REACT_NATIVE_PACKAGER_HOSTNAME="<your-LAN-IP>"
npx expo start -c
```

Every developer uses **their own** database and their own `.env`. Never share a
dev database and never commit `.env`.

---

## 2. Branching

- `main` is always green and demoable.
- Branch names: `feat/…`, `fix/…`, `docs/…`, `chore/…`.
- Keep branches under ~3 days. Rebase on `main` daily.
- PR + 1 approval + CI green to merge. Squash-merge only.
- Never push directly to `main`; never force-push `main`.

Commit messages follow Conventional Commits:

```
feat(mobile): render request draft cards
fix(server): reject offers on cancelled requests
docs(api): document offer acceptance
```

---

## 3. Definition of Done

Every PR must satisfy:

- [ ] `tsc --noEmit` clean in every app you touched
- [ ] server tests passing (`npm test -- --runInBand --forceExit`)
- [ ] new behaviour covered by a test
- [ ] `docs/API_CONTRACT.md` updated if a route, field or status changed
- [ ] a **new** numbered migration if the schema changed (never edit an applied one)
- [ ] no `.env`, secrets, `node_modules` or build output in the diff
- [ ] demo labels intact; no unverified "booked / paid / verified" claims
- [ ] screenshot or GIF for UI changes

---

## 4. Rules specific to this repo

### Migrations
- `001` and `002` are applied. They are frozen.
- New change → `003_short_description.sql`, then `004`, etc.
- Migrations must be idempotent (`IF NOT EXISTS`, `DROP TRIGGER IF EXISTS`) and
  must run on a fresh database.
- Seed scripts must be re-runnable (`ON CONFLICT`).

### API contract
- `docs/API_CONTRACT.md` is the source of truth, updated in the same PR.
- Additive changes only inside `/api/v1`. Breaking change → `/api/v2`.
- Errors stay machine-readable: `{ error, message }` with a stable code.

### AI / concierge
- The model is untrusted. Permissions, compliance, pricing and state
  transitions live in `server/src/domain/**`, never in a prompt.
- Compliance decisions come from `compliance.ts` only. Do not add "if category
  is X" checks in routes.
- Any new consequential action needs an explicit approval step and a test.

### Compliance
- Firearms, narcotics, forged documents, organs/trafficking, sexual services,
  gambling, violence-for-hire, counterfeit goods, child labour: **blocked**.
  Do not "temporarily enable" them.
- Alcohol/tobacco/pharmacy/childcare/healthcare/security: **gated**. They stay
  non-transactable until a licensed integration + verification flow exists.
- Labour floor and shift cap are policy constants in `compliance.ts`. Change
  them deliberately, with a test, not to make a demo pass.

### Dependencies
- One person runs `npm install` and commits the lockfile; everyone else `npm ci`.
- Do **not** run `npm audit fix --force`. It previously broke jest/ts-jest here.

---

## 5. Work split (current)

| Track | Owns |
|---|---|
| A — Backend engine | `server/src/domain/**`, `server/src/modules/{requests,orders,catalog}/**`, `migrations/003*` |
| B — Mobile | `mobile/src/**` |
| C — Web | `web/**` |
| D — Platform / QA | `.github/**`, `docs/**`, `tasks/**`, root scripts |

Shared hot spots — announce before editing:

- `server/src/index.ts` (route registration) — keep changes to one block.
- `docs/API_CONTRACT.md` — append sections, don't rewrite others' rows.
- `docs/todo.md` / `tasks/todo.md` — prefer GitHub Issues over editing shared files.

---

## 6. Local checks

```powershell
# from the repo root
npm run typecheck        # all three apps
npm test                 # server suite
npm run build:web        # once web TS errors are fixed
```

CI runs the same gates on every PR (`.github/workflows/ci.yml`).

---

## 7. Reporting

- Bug: open an issue with steps, expected vs actual, and the request ID.
- Security or privacy issue: do not open a public issue; message the maintainers
  directly.
