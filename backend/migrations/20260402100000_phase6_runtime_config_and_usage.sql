CREATE TABLE app_config (
    key TEXT PRIMARY KEY,
    value_json JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE app_config_audit (
    id BIGSERIAL PRIMARY KEY,
    key TEXT NOT NULL,
    old_value_json JSONB,
    new_value_json JSONB NOT NULL,
    actor TEXT NOT NULL DEFAULT 'system',
    changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO app_config (key, value_json)
VALUES
    ('free_daily_quota_base', to_jsonb(25)),
    ('free_daily_quota_free_model_bonus', to_jsonb(15)),
    (
        'free_openrouter_model_allowlist',
        to_jsonb(ARRAY[
            'openai/gpt-4o-mini',
            'meta-llama/llama-3.1-8b-instruct:free'
        ]::TEXT[])
    ),
    ('ai_provider', to_jsonb('openrouter'::TEXT)),
    ('ai_default_model_id', to_jsonb('openai/gpt-4o-mini'::TEXT)),
    ('paid_daily_quota', 'null'::JSONB)
ON CONFLICT (key) DO NOTHING;
