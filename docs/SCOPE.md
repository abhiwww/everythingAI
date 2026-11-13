# MVP Scope — What's In and What's Out

> **Update (Phase 2):** the three-category limit below has been superseded by the
> universal engine in [`UNIVERSAL_PLATFORM.md`](./UNIVERSAL_PLATFORM.md). The
> platform now serves 36 legal categories through a data-driven registry, with
> compliance gates for alcohol, tobacco, pharmacy, childcare, healthcare and
> security, and hard blocks for firearms, narcotics, forged documents and other
> illegal requests. Pilot city (Bengaluru), currency (INR), English-only and
> "no payments" remain unchanged.

## Build now (MVP)
| Capability | Status | Notes |
|---|---|---|
| Customer chat with text input, message history, loading states, actionable cards | ✅ Implemented | Mobile-first responsive |
| Sign-in, customer profile, consent, saved service addresses | ✅ Implemented | Auth scaffold |
| Request understanding and follow-up questions | ✅ Implemented | AI orchestration + deterministic fallback |
| Three initial categories: cleaning, drivers, gardening/general help | ✅ Implemented | Configurable via feature flags |
| Provider discovery from platform database (area, capability, availability, verification, indicative rate) | ✅ Implemented | Read-only, no fake ratings |
| Transparent quotes and explicit customer confirmation | ✅ Implemented | Quote version + consent recorded |
| Provider accept/decline workflow and customer booking status | ✅ Implemented | State machine + audit trail |
| Simple provider portal | ✅ Implemented | Mobile-friendly |
| Simple admin dashboard | ✅ Implemented | Role-based access + audit logs |
| Manual operations fallback | ✅ Implemented | Operator-assisted matching |
| Reviews, support contact, cancellation requests, basic incident reporting | ✅ Implemented | Scaffold |
| Planning-only travel suggestions (clearly labelled) | ✅ Implemented | No live data claims |

## Design for later — do NOT present as live
| Capability | Status | Reason |
|---|---|---|
| Snack/grocery ordering via real merchant integrations | ❌ Not implemented | Placeholder `prepare_shopping_list` only |
| Payment processing, refunds, payouts, commissions | ❌ Not implemented | Future payments interface placeholder only |
| Voice input | ❌ Not implemented | Button clearly disabled |
| Kannada and regional languages | ❌ Not implemented | English first |
| Conversation companions, babysitting, security, engineering, doctors | ❌ Not implemented | Require specialist verification + legal review |
| Statewide/national expansion | ❌ Not implemented | Bengaluru pilot only |
| Advanced agent automation | ❌ Not implemented | Human ops fallback in MVP |

## Unsupported category response
"We don't offer this yet. Would you like to request it or speak to support?"

## Acceptance criteria (from Section 14)
The MVP is ready for a controlled pilot only if:
1. A customer can describe a supported service in chat, provide missing details, and see actual eligible providers or an honest no-results message.
2. A customer sees the price, timing, address, and conditions before explicitly requesting a booking.
3. A booking request is not shown as confirmed until an authorised provider accepts it.
4. A provider can accept or decline; concurrent acceptance and duplicate submissions are handled safely.
5. Customer and provider can view accurate current status and booking history.
6. An admin can review provider verification, manage requests, and inspect an audit trail.
7. Unsupported services and unavailable integrations are clearly disclosed; no fake ordering or payments occur.
8. AI cannot bypass backend authorization or confirmation, even if prompted to do so.
9. Errors, cancellations, provider timeouts, and support escalation work and are tested.
10. Private data is access-controlled, and the system has basic logging, backups, and an incident process.
11. Demo data is visibly labelled, and no claims of real provider availability are made in demo mode.
12. Accessibility and mobile layouts tested; no high-severity unresolved security issue knowingly deployed.