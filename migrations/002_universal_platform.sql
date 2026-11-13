-- Everyday AI Concierge — Migration 002
-- Universal "order anything" engine: categories, provider capabilities,
-- requests, offers, orders, compliance audit.
--
-- Run after 001_initial.sql. Idempotent where practical.

-- ---------------------------------------------------------------------------
-- Category registry (data-driven — new verticals are rows, not code)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  vertical TEXT NOT NULL CHECK (vertical IN (
    'goods','food','home_service','personal_service','ride','delivery','rental','professional','planning'
  )),
  description TEXT,
  provider_role TEXT,
  fulfillment TEXT NOT NULL CHECK (fulfillment IN ('delivery','onsite','at_provider','remote','handover')),
  pricing TEXT NOT NULL CHECK (pricing IN ('fixed','per_unit','hourly','daily','quote','dynamic')),
  compliance TEXT NOT NULL CHECK (compliance IN ('none','age_gated','licensed_goods','licensed_service','prohibited')),
  min_age INTEGER,
  licence_type TEXT,
  required_attributes JSONB NOT NULL DEFAULT '[]'::jsonb,
  optional_attributes JSONB NOT NULL DEFAULT '[]'::jsonb,
  keywords TEXT[] NOT NULL DEFAULT '{}',
  examples TEXT[] NOT NULL DEFAULT '{}',
  price_hint JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_transactable BOOLEAN NOT NULL DEFAULT true,
  legal_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Provider capabilities: what a provider can actually serve
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS provider_capabilities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID NOT NULL REFERENCES provider_profiles(id) ON DELETE CASCADE,
  category_slug TEXT NOT NULL REFERENCES categories(slug) ON DELETE CASCADE,
  attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
  pricing JSONB NOT NULL DEFAULT '{}'::jsonb,
  capacity_per_day INTEGER,
  service_radius_km NUMERIC,
  licence_type TEXT,
  licence_number TEXT,
  licence_expires_at DATE,
  licence_verified BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','suspended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider_id, category_slug)
);

-- ---------------------------------------------------------------------------
-- Requests: what the customer wants, in any vertical
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  category_slug TEXT NOT NULL REFERENCES categories(slug),
  raw_text TEXT,
  attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
  city TEXT NOT NULL DEFAULT 'Bengaluru',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft','collecting_details','awaiting_confirmation','matching','quoted',
    'confirmed','fulfilling','completed','cancelled','rejected','expired'
  )),
  compliance JSONB NOT NULL DEFAULT '{}'::jsonb,
  price_estimate JSONB NOT NULL DEFAULT '{}'::jsonb,
  summary TEXT,
  idempotency_key TEXT UNIQUE,
  confirmed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Offers: provider response to a request
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS request_offers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES provider_profiles(id) ON DELETE CASCADE,
  price NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  eta_minutes INTEGER,
  valid_until TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'offered' CHECK (status IN ('offered','accepted','declined','expired','withdrawn')),
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Orders: authoritative confirmed record
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID NOT NULL REFERENCES requests(id),
  offer_id UUID REFERENCES request_offers(id),
  booking_id UUID REFERENCES bookings(id),
  customer_id UUID NOT NULL REFERENCES users(id),
  provider_id UUID NOT NULL REFERENCES provider_profiles(id),
  category_slug TEXT NOT NULL REFERENCES categories(slug),
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN (
    'confirmed','preparing','in_progress','completed','cancelled','disputed'
  )),
  total NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
  idempotency_key TEXT UNIQUE,
  confirmed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Append-only order history
CREATE TABLE IF NOT EXISTS order_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  actor_id UUID REFERENCES users(id),
  actor_role TEXT,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Compliance audit trail — every decision is recorded
CREATE TABLE IF NOT EXISTS compliance_checks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_type TEXT NOT NULL CHECK (subject_type IN ('request','provider','message')),
  subject_id UUID,
  category_slug TEXT,
  decision TEXT NOT NULL CHECK (decision IN ('allow','gate','block')),
  code TEXT NOT NULL,
  detail JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_categories_vertical ON categories(vertical);
CREATE INDEX IF NOT EXISTS idx_categories_keywords ON categories USING GIN(keywords);
CREATE INDEX IF NOT EXISTS idx_provider_capabilities_category ON provider_capabilities(category_slug);
CREATE INDEX IF NOT EXISTS idx_requests_customer ON requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_category ON requests(category_slug);
CREATE INDEX IF NOT EXISTS idx_request_offers_request ON request_offers(request_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_provider ON orders(provider_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_events_order ON order_events(order_id);
CREATE INDEX IF NOT EXISTS idx_compliance_checks_subject ON compliance_checks(subject_type, subject_id);

DROP TRIGGER IF EXISTS trg_categories_updated_at ON categories;
CREATE TRIGGER trg_categories_updated_at BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_provider_capabilities_updated_at ON provider_capabilities;
CREATE TRIGGER trg_provider_capabilities_updated_at BEFORE UPDATE ON provider_capabilities
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_requests_updated_at ON requests;
CREATE TRIGGER trg_requests_updated_at BEFORE UPDATE ON requests
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_orders_updated_at ON orders;
CREATE TRIGGER trg_orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
