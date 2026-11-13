# Security, Privacy & Safety Checklist — Everyday AI Concierge MVP

## Authentication & authorization
- [ ] JWT sessions with short expiry and refresh rotation
- [ ] Password hashing (bcrypt/argon2), no plaintext passwords
- [ ] Role-based access control (customer, provider, admin, support)
- [ ] Server-side authorization on every endpoint
- [ ] Ownership check on every record (user can only access own bookings/conversations)
- [ ] Idempotency keys on state-changing requests
- [ ] Rate limiting on auth and chat endpoints

## Data protection
- [ ] Encrypt data in transit (TLS) and at rest
- [ ] Secrets management (environment variables / secret manager), never committed to repo
- [ ] No secrets exposed to browser
- [ ] No payment card credentials stored
- [ ] Sensitive identity documents separated from ordinary profile data
- [ ] Short-lived access URLs for file storage
- [ ] Malware and file-type checks on uploads
- [ ] Access logs for sensitive records
- [ ] Backups and tested recovery

## AI safety
- [ ] AI treated as probabilistic and untrusted
- [ ] Structured output schemas for all AI-produced fields
- [ ] Backend enforces permissions, confirmation, and business rules
- [ ] AI cannot trigger privileged actions (no tool use without server-side approval)
- [ ] Prompt injection protection: retrieved text never treated as system instructions
- [ ] AI-generated suggestions clearly labelled
- [ ] No fabricated provider credentials, pricing, reviews, or completed actions
- [ ] Deterministic fallback when AI credentials absent

## Privacy & consent
- [ ] Meaningful consent before sharing address, phone, identity documents, personal context
- [ ] Consent recorded with purpose, timestamp, source
- [ ] Access, correction, deletion workflows (subject to legal retention)
- [ ] Data minimisation — collect only what's needed for the next step
- [ ] Retention rules defined and documented
- [ ] DPDP framework review with qualified counsel (India)

## Safety & safeguarding
- [ ] Provider verification is an actual operational process (not AI checkbox)
- [ ] Stronger checks for home access, children, health, security services
- [ ] Crisis guidance for self-harm/immediate danger; encourage local emergency help
- [ ] No 24/7 human monitoring promise unless actually staffed
- [ ] Companionship not presented as mental-health care
- [ ] Age limits and consent for minors/vulnerable adults
- [ ] Incident reporting and escalation path
- [ ] Support ticket handling with access controls

## Operations
- [ ] Audit trail (who accessed/changed what, when)
- [ ] Admin dashboard role-based data minimisation
- [ ] Incident response process and drills
- [ ] Security review before pilot
- [ ] Demo data visibly labelled; no real provider availability claims in demo mode

## Legal review (with qualified counsel)
- [ ] Indian privacy law (DPDP) compliance
- [ ] Consumer protection law
- [ ] Labour law (provider engagement model)
- [ ] Tax implications
- [ ] Sector-specific licensing for regulated categories (when added)