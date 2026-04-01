-- Core auth, marketplace data, and pricing history.

CREATE TYPE subscription_tier AS ENUM ('free', 'paid');
CREATE TYPE marketplace AS ENUM ('wildberries', 'ozon');

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    tier subscription_tier NOT NULL DEFAULT 'free',
    valid_until TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT subscriptions_one_per_user UNIQUE (user_id)
);

CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    key_prefix TEXT NOT NULL,
    key_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_used_at TIMESTAMPTZ
);

CREATE INDEX idx_api_keys_prefix ON api_keys (key_prefix);

CREATE TABLE product_snapshots (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    marketplace marketplace NOT NULL,
    external_offer_id TEXT NOT NULL,
    payload JSONB NOT NULL,
    captured_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_product_snapshots_user_mkt_time
    ON product_snapshots (user_id, marketplace, captured_at DESC);

CREATE TABLE competitor_offers (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    marketplace marketplace NOT NULL,
    external_offer_id TEXT NOT NULL,
    title TEXT,
    payload JSONB NOT NULL,
    observed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_competitor_user_mkt ON competitor_offers (user_id, marketplace);

CREATE TABLE pricing_history (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    marketplace marketplace NOT NULL,
    external_offer_id TEXT NOT NULL,
    price_minor BIGINT NOT NULL,
    currency TEXT NOT NULL DEFAULT 'RUB',
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pricing_user_offer_time
    ON pricing_history (user_id, marketplace, external_offer_id, recorded_at DESC);
