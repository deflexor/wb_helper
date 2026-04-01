-- Seller tokens for marketplace API sync (encrypt at rest in production).

CREATE TABLE marketplace_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    marketplace marketplace NOT NULL,
    label TEXT NOT NULL DEFAULT 'default',
    wb_api_token TEXT,
    ozon_client_id TEXT,
    ozon_api_key TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT marketplace_credentials_user_mkt_label UNIQUE (user_id, marketplace, label)
);

CREATE INDEX idx_marketplace_credentials_user ON marketplace_credentials (user_id);
