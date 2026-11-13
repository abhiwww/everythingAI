# Data Model — Everyday AI Concierge MVP

## Schema overview (PostgreSQL)

All tables use `created_at`, `updated_at` (timestamptz) and `deleted_at` (soft delete). Primary keys are UUIDs.

### 1. users
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| email | TEXT unique | |
| phone | TEXT | |
| password_hash | TEXT | |
| role | TEXT | customer, provider, admin, support |
| is_active | BOOLEAN | |
| email_verified | BOOLEAN | |
| phone_verified | BOOLEAN | |
| language | TEXT | default 'en' |
| created_at, updated_at, deleted_at | timestamptz | |

### 2. sessions
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| user_id | UUID FK → users.id | |
| token_hash | TEXT unique | |
| expires_at | timestamptz | |
| created_at | timestamptz | |

### 3. addresses
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| user_id | UUID FK → users.id | |
| label | TEXT | e.g. "Home" |
| street | TEXT | |
| area | TEXT | Bengaluru neighbourhood |
| city | TEXT | |
| pincode | TEXT | |
| latitude, longitude | NUMERIC | PostGIS-ready |
| is_default | BOOLEAN | |
| created_at, updated_at | timestamptz | |

### 4. consents
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| user_id | UUID FK → users.id | |
| purpose | TEXT | e.g. "share_address_with_provider" |
| granted | BOOLEAN | |
| granted_at | timestamptz | |
| source | TEXT | chat / portal / admin |

### 5. service_categories
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| name | TEXT | cleaning, driving, gardening |
| slug | TEXT unique | |
| description | TEXT | |
| is_active | BOOLEAN | feature flag |
| requires_verification | BOOLEAN | |
| min_age | INTEGER | |
| created_at, updated_at | timestamptz | |

### 6. provider_profiles
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| user_id | UUID FK → users.id | |
| display_name | TEXT | |
| categories | UUID[] | FK → service_categories |
| service_areas | TEXT[] | Bengaluru neighbourhoods |
| languages | TEXT[] | |
| availability | JSONB | weekly schedule |
| pricing_rules | JSONB | hourly rate, minimum call-out, travel radius |
| verification_status | TEXT | pending, under_review, verified, rejected, suspended, expired |
| verification_reason | TEXT | |
| documents_verified_at | timestamptz | |
| rating_label | TEXT | 'New provider' or numeric (only when real) |
| created_at, updated_at | timestamptz | |

### 7. provider_documents
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| provider_id | UUID FK → provider_profiles.id | |
| document_type | TEXT | id_proof, address_proof, category_cert |
| storage_path | TEXT | private object storage |
| short_url_token | TEXT | short-lived access |
| reviewed_by | UUID FK → users.id | |
| reviewed_at | timestamptz | |
| review_decision | TEXT | approved, rejected |
| review_notes | TEXT | |
| created_at | timestamptz | |

### 8. provider_availability
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| provider_id | UUID FK → provider_profiles.id | |
| start_at | timestamptz | |
| end_at | timestamptz | |
| is_available | BOOLEAN | |
| created_at | timestamptz | |

### 9. conversations
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| customer_id | UUID FK → users.id | |
| title | TEXT | |
| status | TEXT | active, archived |
| workflow_context | JSONB | linked booking/quote ids |
| created_at, updated_at | timestamptz | |

### 10. messages
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| conversation_id | UUID FK → conversations.id | |
| role | TEXT | customer, assistant, system |
| content | TEXT | |
| message_type | TEXT | text, card, confirmation, status |
| metadata | JSONB | provider ids, quote id, booking id |
| is_ai_generated | BOOLEAN | |
| created_at | timestamptz | |

### 11. quotes
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| customer_id | UUID FK → users.id | |
| service_category_id | UUID FK → service_categories.id | |
| address_id | UUID FK → addresses.id | |
| scheduled_at | timestamptz | |
| duration_hours | NUMERIC | |
| indicative_price | NUMERIC | INR, minor units (paise) |
| price_components | JSONB | breakdown |
| tax | NUMERIC | |
| total | NUMERIC | |
| is_estimate | BOOLEAN | true = estimate, false = firm |
| expires_at | timestamptz | |
| version | INTEGER | |
| created_at | timestamptz | |

### 12. bookings
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| quote_id | UUID FK → quotes.id | |
| customer_id | UUID FK → users.id | |
| provider_id | UUID FK → provider_profiles.id | nullable |
| status | TEXT | draft, quote_ready, customer_approved, provider_pending, confirmed, in_progress, completed, provider_declined, expired, cancel_requested, cancelled, disputed, failed |
| idempotency_key | TEXT unique | |
| scheduled_at | timestamptz | |
| address_id | UUID FK → addresses.id | |
| total | NUMERIC | |
| cancellation_terms | TEXT | |
| confirmed_at | timestamptz | |
| completed_at | timestamptz | |
| created_at, updated_at | timestamptz | |

### 13. booking_events (append-only)
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| booking_id | UUID FK → bookings.id | |
| from_status | TEXT | |
| to_status | TEXT | |
| actor_id | UUID FK → users.id | |
| actor_role | TEXT | |
| reason | TEXT | |
| created_at | timestamptz | |

### 14. provider_responses
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| booking_id | UUID FK → bookings.id | |
| provider_id | UUID FK → provider_profiles.id | |
| decision | TEXT | accepted, declined, timed_out |
| responded_at | timestamptz | |
| notes | TEXT | |

### 15. reviews
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| booking_id | UUID FK → bookings.id | |
| customer_id | UUID FK → users.id | |
| provider_id | UUID FK → provider_profiles.id | |
| rating | INTEGER | 1-5 (only when real) |
| comment | TEXT | |
| created_at | timestamptz | |

### 16. support_tickets
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| customer_id | UUID FK → users.id | |
| booking_id | UUID FK → bookings.id | nullable |
| type | TEXT | cancellation, complaint, incident, dispute |
| status | TEXT | open, in_progress, resolved, closed |
| created_at, updated_at | timestamptz | |

### 17. incidents
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| ticket_id | UUID FK → support_tickets.id | |
| severity | TEXT | low, medium, high, critical |
| description | TEXT | |
| reported_at | timestamptz | |
| resolved_at | timestamptz | |

### 18. notifications
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| user_id | UUID FK → users.id | |
| channel | TEXT | email, sms, whatsapp |
| template | TEXT | |
| status | TEXT | queued, sent, failed, delivered |
| external_reference | TEXT | |
| created_at, sent_at | timestamptz | |

### 19. admin_audit_events
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| actor_id | UUID FK → users.id | |
| action | TEXT | |
| target_type | TEXT | |
| target_id | UUID | |
| metadata | JSONB | |
| created_at | timestamptz | |

### 20. feature_flags
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| name | TEXT unique | |
| enabled | BOOLEAN | |
| scope | TEXT | category, location, integration |
| created_at, updated_at | timestamptz | |

## Indexes (suggested)
- users(email), users(role)
- sessions(token_hash), sessions(expires_at)
- provider_profiles(verification_status), provider_profiles(categories) using GIN
- bookings(status), bookings(customer_id), bookings(provider_id), bookings(idempotency_key)
- quotes(customer_id), quotes(expires_at)
- messages(conversation_id), messages(created_at)
- admin_audit_events(actor_id), admin_audit_events(created_at)

## Retention rules
- Identity documents: retained per legal requirement, deletable on account deletion subject to legal hold.
- Messages: retained for dispute resolution; deletion on request subject to retention obligations.
- Audit events: append-only, not deleted.
