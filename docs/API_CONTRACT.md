# API Contract — Everyday AI Concierge MVP

## Conventions
- Base path: `/api/v1`
- Auth: Bearer JWT in `Authorization` header
- Errors: RFC 7807 Problem Details (`type`, `title`, `status`, `detail`, `instance`)
- Idempotency: `Idempotency-Key` header on state-changing POST/PUT
- Request IDs: `X-Request-ID` header; echoed in response
- Versioning: URL versioning (`/api/v1/`); breaking changes increment version
- Rate limits: per-endpoint, per-user; 429 on exceed
- All money in INR minor units (paise) unless noted

## Auth
| Endpoint | Method | Auth | Description |
|---|---|---|---|
| /auth/register | POST | none | Customer/provider registration |
| /auth/login | POST | none | Login, returns session token |
| /auth/logout | POST | bearer | Invalidate session |
| /me | GET | bearer | Current user profile |

## Conversations
| Endpoint | Method | Auth | Description |
|---|---|---|---|
| /conversations | POST | bearer | Create conversation |
| /conversations/{id} | GET | bearer | Get conversation + messages |
| /conversations/{id}/messages | POST | bearer | Send message (triggers AI orchestration) |
| /conversations/{id}/messages | GET | bearer | List messages (paginated) |

## Services / providers
| Endpoint | Method | Auth | Description |
|---|---|---|---|
| /services | GET | none/bearer | List active service categories |
| /providers/search | GET | bearer | Search eligible providers (query: category, area, datetime) |

## Quotes
| Endpoint | Method | Auth | Description |
|---|---|---|---|
| /quotes | POST | bearer | Generate quote (read-only/compute) |
| /quotes/{id} | GET | bearer | Get quote details |

## Bookings
| Endpoint | Method | Auth | Description |
|---|---|---|---|
| /bookings | POST | bearer + idempotency key | Submit booking request (explicit approval) |
| /bookings/{id} | GET | bearer | Get booking (ownership check) |
| /bookings/{id}/cancel-request | POST | bearer | Request cancellation |
| /provider/bookings/{id}/accept | POST | bearer (provider) | Accept booking |
| /provider/bookings/{id}/decline | POST | bearer (provider) | Decline booking |

## Support
| Endpoint | Method | Auth | Description |
|---|---|---|---|
| /support/tickets | POST | bearer | Create support ticket |
| /support/tickets | GET | bearer (admin/support) | List tickets |

## Admin (role: admin or support)
| Endpoint | Method | Auth | Description |
|---|---|---|---|
| /admin/providers | GET | bearer | List providers + verification status |
| /admin/providers/{id}/verify | POST | bearer | Verify/reject provider |
| /admin/requests | GET | bearer | Request/booking queue |
| /admin/audit | GET | bearer | Audit log |
| /admin/feature-flags | GET/POST | bearer | Feature flags |

## Booking state transitions (server-enforced)
```
draft → quote_ready → customer_approved → provider_pending → confirmed → in_progress → completed
```
Additional: provider_declined, expired, cancel_requested, cancelled, disputed, failed.

Allowed transitions (actor → from → to):
- customer: draft → quote_ready (prepare), quote_ready → customer_approved (approve quote)
- customer: customer_approved → provider_pending (submit booking request)
- provider: provider_pending → confirmed (accept), provider_pending → provider_declined (decline)
- system: any → expired (timeout), confirmed → in_progress (start), in_progress → completed
- customer/admin: confirmed/in_progress → cancel_requested → cancelled

Renewed customer approval required if price, provider, or time changes materially.

## Tool schemas (AI orchestration)
- `search_services` — read-only, customer session, no booking consent
- `search_providers` — read-only, minimum necessary location data, eligible providers only
- `get_quote` — read-only/compute, explain assumptions + expiration
- `prepare_booking` — non-committing, draft only, no provider notification unless disclosed
- `submit_booking_request` — consequential, explicit user approval of quote/terms/address/time, server-side validation
- `provider_accept_booking` — consequential, authenticated eligible provider, atomic transition
- `create_support_ticket` — consequential, tell user what is shared, obtain approval
- `prepare_shopping_list` — non-committing, label as list, no order
- `place_order` — future consequential, DISABLED until real integration + approval
- `charge_payment` — future consequential, DISABLED until payment design + legal review + integration

## Security notes
- Server-side authorization on every request; ownership check on every record.
- AI cannot invoke privileged tools without customer approval recorded server-side.
- No secrets in browser; no card credentials stored.