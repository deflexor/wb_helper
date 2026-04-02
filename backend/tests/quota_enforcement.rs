use std::time::Duration;

use std::sync::Arc;

use axum::body::Body;
use axum::http::{HeaderMap, Request, StatusCode};
use backend::app_state_from_env;
use backend::marketplace::MarketplaceRateConfig;
use backend::{create_app, run_migrations, AppState};
use serde_json::{json, Value};
use sqlx::postgres::PgPoolOptions;
use sqlx::Row;
use tower::ServiceExt;
use wiremock::matchers::{method, path};
use wiremock::{Mock, MockServer, ResponseTemplate};

#[tokio::test]
#[ignore = "requires DATABASE_URL and JWT_SECRET"]
async fn runtime_config_defaults_are_loaded() {
    let state = app_state_from_env().await.expect("app state");
    let cfg = state.runtime_config().await.expect("runtime config");

    assert!(cfg.free_daily_quota_base > 0);
    assert!(cfg.free_daily_quota_free_model_bonus > 0);
    assert!(!cfg.free_openrouter_model_allowlist.is_empty());
    assert!(!cfg.ai_provider.is_empty());
    assert!(!cfg.ai_default_model_id.is_empty());
}

#[tokio::test]
#[ignore = "requires DATABASE_URL and JWT_SECRET"]
async fn runtime_config_cache_refreshes_after_ttl() {
    let database_url = std::env::var("DATABASE_URL").expect("DATABASE_URL");
    let jwt_secret = std::env::var("JWT_SECRET").expect("JWT_SECRET");
    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await
        .expect("connect postgres");
    backend::run_migrations(&pool).await.expect("migrate");
    let jwt = backend::auth::JwtConfig::from_secret(jwt_secret.as_bytes(), Duration::from_secs(3600))
        .expect("jwt config");
    let state = Arc::new(AppState {
        pool,
        jwt,
        redis: None,
        http_client: reqwest::Client::new(),
        limits: backend::state::SubscriptionLimits::default(),
        wb_rates: Arc::new(MarketplaceRateConfig::default()),
        ozon_rates: Arc::new(MarketplaceRateConfig::default()),
        ai_service_url: None,
        ai_service_internal_key: None,
        runtime_config_cache: backend::state::RuntimeConfigCache::new(Duration::from_secs(1)),
    });

    let first = state.runtime_config().await.expect("runtime config");
    let updated = first.free_daily_quota_base + 7;

    let outcome: Result<(), Box<dyn std::error::Error>> = async {
        sqlx::query("UPDATE app_config SET value_json = to_jsonb($1::int4) WHERE key = $2")
            .bind(updated as i32)
            .bind("free_daily_quota_base")
            .execute(&state.pool)
            .await?;

        let before_ttl = state.runtime_config().await?;
        if before_ttl.free_daily_quota_base != first.free_daily_quota_base {
            return Err("cache returned refreshed value before TTL expiry".into());
        }

        tokio::time::sleep(Duration::from_secs(2)).await;

        let after_ttl = state.runtime_config().await?;
        if after_ttl.free_daily_quota_base != updated {
            return Err("cache did not refresh after TTL expiry".into());
        }

        let row = sqlx::query("SELECT key FROM app_config WHERE key = $1")
            .bind("free_daily_quota_base")
            .fetch_one(&state.pool)
            .await?;
        let key: String = row.try_get("key")?;
        if key != "free_daily_quota_base" {
            return Err("app_config lookup returned unexpected key".into());
        }
        Ok(())
    }
    .await;

    sqlx::query("UPDATE app_config SET value_json = to_jsonb($1::int4) WHERE key = $2")
        .bind(first.free_daily_quota_base as i32)
        .bind("free_daily_quota_base")
        .execute(&state.pool)
        .await
        .expect("restore app config");

    outcome.expect("ttl refresh test outcome");
}

async fn integration_state(ai_base_url: &str, redis_url: Option<&str>) -> Arc<AppState> {
    let database_url = std::env::var("DATABASE_URL").expect("DATABASE_URL");
    let jwt_secret = std::env::var("JWT_SECRET").expect("JWT_SECRET");
    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await
        .expect("connect postgres");
    run_migrations(&pool).await.expect("migrate");
    let jwt = backend::auth::JwtConfig::from_secret(jwt_secret.as_bytes(), Duration::from_secs(3600))
        .expect("jwt config");
    let redis = match redis_url {
        Some(url) => {
            let client = redis::Client::open(url).expect("redis client");
            Some(
                redis::aio::ConnectionManager::new(client)
                    .await
                    .expect("redis connect"),
            )
        }
        None => None,
    };
    Arc::new(AppState {
        pool,
        jwt,
        redis,
        http_client: reqwest::Client::new(),
        limits: backend::state::SubscriptionLimits::default(),
        wb_rates: Arc::new(MarketplaceRateConfig::default()),
        ozon_rates: Arc::new(MarketplaceRateConfig::default()),
        ai_service_url: Some(ai_base_url.to_string()),
        ai_service_internal_key: None,
        runtime_config_cache: backend::state::RuntimeConfigCache::new(Duration::from_secs(0)),
    })
}

async fn register_and_token(
    app: &axum::Router<()>,
    email: &str,
) -> (String, uuid::Uuid) {
    let body = json!({ "email": email, "password": "password123" });
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/auth/register")
                .header("content-type", "application/json")
                .body(Body::from(body.to_string()))
                .expect("register request"),
        )
        .await
        .expect("register response");
    assert_eq!(res.status(), StatusCode::OK);
    let bytes = axum::body::to_bytes(res.into_body(), 1024 * 1024)
        .await
        .expect("register body");
    let payload: Value = serde_json::from_slice(&bytes).expect("register json");
    let token = payload["token"].as_str().expect("token").to_string();
    let user_id = uuid::Uuid::parse_str(payload["user_id"].as_str().expect("user_id"))
        .expect("user id parse");
    (token, user_id)
}

async fn post_authed_json(
    app: &axum::Router<()>,
    token: &str,
    uri: &str,
    body: Value,
) -> (StatusCode, Value) {
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri(uri)
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {token}"))
                .body(Body::from(body.to_string()))
                .expect("request"),
        )
        .await
        .expect("response");
    let status = res.status();
    let bytes = axum::body::to_bytes(res.into_body(), 1024 * 1024)
        .await
        .expect("body");
    let json = serde_json::from_slice(&bytes).unwrap_or_else(|_| json!({ "raw": String::from_utf8_lossy(&bytes).to_string() }));
    (status, json)
}

async fn post_authed_json_with_headers(
    app: &axum::Router<()>,
    token: &str,
    uri: &str,
    body: Value,
) -> (StatusCode, Value, HeaderMap) {
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri(uri)
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {token}"))
                .body(Body::from(body.to_string()))
                .expect("request"),
        )
        .await
        .expect("response");
    let status = res.status();
    let headers = res.headers().clone();
    let bytes = axum::body::to_bytes(res.into_body(), 1024 * 1024)
        .await
        .expect("body");
    let json = serde_json::from_slice(&bytes)
        .unwrap_or_else(|_| json!({ "raw": String::from_utf8_lossy(&bytes).to_string() }));
    (status, json, headers)
}

async fn set_free_quota_config(state: &Arc<AppState>, base: i32, bonus: i32, allowlist: Value) {
    sqlx::query(
        "UPDATE app_config
         SET value_json = CASE
             WHEN key = 'free_daily_quota_base' THEN to_jsonb($1::int4)
             WHEN key = 'free_daily_quota_free_model_bonus' THEN to_jsonb($2::int4)
             WHEN key = 'free_openrouter_model_allowlist' THEN $3::jsonb
             ELSE value_json
         END
         WHERE key IN ('free_daily_quota_base', 'free_daily_quota_free_model_bonus', 'free_openrouter_model_allowlist')",
    )
    .bind(base)
    .bind(bonus)
    .bind(allowlist)
    .execute(&state.pool)
    .await
    .expect("update quota config");
}

async fn set_ai_provider(state: &Arc<AppState>, provider: &str) {
    sqlx::query("UPDATE app_config SET value_json = to_jsonb($1::text) WHERE key = 'ai_provider'")
        .bind(provider)
        .execute(&state.pool)
        .await
        .expect("update ai provider");
}

#[tokio::test]
#[ignore = "requires DATABASE_URL, JWT_SECRET, REDIS_URL"]
async fn free_user_quota_is_combined_for_chat_and_niche() {
    let redis_url = std::env::var("REDIS_URL").expect("REDIS_URL");
    let ai = MockServer::start().await;
    Mock::given(method("POST"))
        .and(path("/v1/chat/completions"))
        .respond_with(ResponseTemplate::new(200).set_body_json(json!({
            "content": "ok",
            "model_used": "openai/gpt-4o-mini"
        })))
        .mount(&ai)
        .await;
    Mock::given(method("POST"))
        .and(path("/v1/analysis/niche"))
        .respond_with(ResponseTemplate::new(200).set_body_json(json!({
            "matches": [],
            "summary": "ok"
        })))
        .mount(&ai)
        .await;

    let state = integration_state(&ai.uri(), Some(&redis_url)).await;
    set_free_quota_config(&state, 1, 0, json!([])).await;
    let app = create_app(state.clone());
    let (token, _) = register_and_token(&app, &format!("quota-combined-{}@example.com", uuid::Uuid::new_v4())).await;

    let (status1, _) = post_authed_json(
        &app,
        &token,
        "/api/ai/chat",
        json!({"tool":"default","model":"openai/gpt-4o-mini","messages":[{"role":"user","content":"hi"}]}),
    )
    .await;
    assert_eq!(status1, StatusCode::OK);

    let (status2, payload2) = post_authed_json(
        &app,
        &token,
        "/api/ai/niche",
        json!({"query":"wireless mouse","limit":5}),
    )
    .await;
    assert_eq!(status2, StatusCode::TOO_MANY_REQUESTS);
    assert_eq!(payload2["code"], "daily_quota_exceeded");
}

#[tokio::test]
#[ignore = "requires DATABASE_URL, JWT_SECRET, REDIS_URL"]
async fn free_model_allowlist_gets_bonus_limit_per_request() {
    let redis_url = std::env::var("REDIS_URL").expect("REDIS_URL");
    let ai = MockServer::start().await;
    Mock::given(method("POST"))
        .and(path("/v1/chat/completions"))
        .respond_with(ResponseTemplate::new(200).set_body_json(json!({
            "content": "ok",
            "model_used": "openai/gpt-4o-mini"
        })))
        .mount(&ai)
        .await;

    let state = integration_state(&ai.uri(), Some(&redis_url)).await;
    set_ai_provider(&state, "openrouter").await;
    sqlx::query("UPDATE app_config SET value_json = to_jsonb($1::text) WHERE key = 'ai_default_model_id'")
        .bind("openai/gpt-4o-mini")
        .execute(&state.pool)
        .await
        .expect("update ai default model");
    set_free_quota_config(&state, 1, 2, json!(["openai/gpt-4o-mini"])).await;
    let cfg = state.runtime_config().await.expect("runtime config");
    assert_eq!(cfg.ai_provider, "openrouter");
    assert_eq!(cfg.ai_default_model_id, "openai/gpt-4o-mini");
    assert_eq!(
        backend::usage_quota::resolve_limit(
            backend::models::SubscriptionTier::Free,
            cfg.ai_default_model_id.as_str(),
            &cfg,
        ),
        Some(3)
    );
    let app = create_app(state.clone());
    let (token, _) = register_and_token(&app, &format!("quota-bonus-{}@example.com", uuid::Uuid::new_v4())).await;

    for _ in 0..3 {
        let (status, _) = post_authed_json(
            &app,
            &token,
            "/api/ai/chat",
            json!({"tool":"default","model":"openai/gpt-4o-mini","messages":[{"role":"user","content":"hi"}]}),
        )
        .await;
        assert_eq!(status, StatusCode::OK);
    }

    let (status4, _) = post_authed_json(
        &app,
        &token,
        "/api/ai/chat",
        json!({"tool":"default","model":"openai/gpt-4o-mini","messages":[{"role":"user","content":"hi"}]}),
    )
    .await;
    assert_eq!(status4, StatusCode::TOO_MANY_REQUESTS);
}

#[tokio::test]
#[ignore = "requires DATABASE_URL, JWT_SECRET, REDIS_URL"]
async fn mixed_model_requests_apply_correct_limit_each_time() {
    let redis_url = std::env::var("REDIS_URL").expect("REDIS_URL");
    let ai = MockServer::start().await;
    Mock::given(method("POST"))
        .and(path("/v1/chat/completions"))
        .respond_with(ResponseTemplate::new(200).set_body_json(json!({
            "content": "ok",
            "model_used": "openai/gpt-4o-mini"
        })))
        .mount(&ai)
        .await;

    let state = integration_state(&ai.uri(), Some(&redis_url)).await;
    set_ai_provider(&state, "openrouter").await;
    sqlx::query("UPDATE app_config SET value_json = to_jsonb($1::text) WHERE key = 'ai_default_model_id'")
        .bind("openai/gpt-4o-mini")
        .execute(&state.pool)
        .await
        .expect("update ai default model");
    set_free_quota_config(&state, 1, 2, json!(["openai/gpt-4o-mini"])).await;
    let cfg = state.runtime_config().await.expect("runtime config");
    assert_eq!(cfg.ai_provider, "openrouter");
    assert_eq!(cfg.ai_default_model_id, "openai/gpt-4o-mini");
    assert_eq!(
        backend::usage_quota::resolve_limit(
            backend::models::SubscriptionTier::Free,
            cfg.ai_default_model_id.as_str(),
            &cfg,
        ),
        Some(3)
    );
    let app = create_app(state.clone());
    let (token, _) = register_and_token(&app, &format!("quota-mixed-{}@example.com", uuid::Uuid::new_v4())).await;

    let (s1, _) = post_authed_json(
        &app,
        &token,
        "/api/ai/chat",
        json!({"tool":"default","model":"openai/gpt-4o-mini","messages":[{"role":"user","content":"hi"}]}),
    )
    .await;
    assert_eq!(s1, StatusCode::OK);

    let (s2, _) = post_authed_json(
        &app,
        &token,
        "/api/ai/chat",
        json!({"tool":"default","model":"openai/gpt-4o-mini","messages":[{"role":"user","content":"hi"}]}),
    )
    .await;
    assert_eq!(s2, StatusCode::OK);

    let (s3, _) = post_authed_json(
        &app,
        &token,
        "/api/ai/chat",
        json!({"tool":"default","model":"anthropic/claude-3.5-sonnet","messages":[{"role":"user","content":"hi"}]}),
    )
    .await;
    assert_eq!(s3, StatusCode::OK);

    let (s4, payload4) = post_authed_json(
        &app,
        &token,
        "/api/ai/chat",
        json!({"tool":"default","model":"anthropic/claude-3.5-sonnet","messages":[{"role":"user","content":"hi"}]}),
    )
    .await;
    assert_eq!(s4, StatusCode::TOO_MANY_REQUESTS);
    assert_eq!(payload4["code"], "daily_quota_exceeded");
}

#[tokio::test]
#[ignore = "requires DATABASE_URL, JWT_SECRET, REDIS_URL"]
async fn quota_429_payload_contains_required_fields() {
    let redis_url = std::env::var("REDIS_URL").expect("REDIS_URL");
    let ai = MockServer::start().await;
    Mock::given(method("POST"))
        .and(path("/v1/chat/completions"))
        .respond_with(ResponseTemplate::new(200).set_body_json(json!({
            "content": "ok",
            "model_used": "openai/gpt-4o-mini"
        })))
        .mount(&ai)
        .await;

    let state = integration_state(&ai.uri(), Some(&redis_url)).await;
    set_free_quota_config(&state, 1, 0, json!([])).await;
    let app = create_app(state.clone());
    let (token, _) = register_and_token(&app, &format!("quota-429-{}@example.com", uuid::Uuid::new_v4())).await;

    let _ = post_authed_json(
        &app,
        &token,
        "/api/ai/chat",
        json!({"tool":"default","model":"openai/gpt-4o-mini","messages":[{"role":"user","content":"hi"}]}),
    )
    .await;
    let (status, payload) = post_authed_json(
        &app,
        &token,
        "/api/ai/chat",
        json!({"tool":"default","model":"openai/gpt-4o-mini","messages":[{"role":"user","content":"again"}]}),
    )
    .await;
    assert_eq!(status, StatusCode::TOO_MANY_REQUESTS);
    for key in ["code", "message", "used", "limit", "resets_at_utc", "upgrade_url"] {
        assert!(
            payload.get(key).is_some(),
            "missing required 429 key: {key}; payload={payload}"
        );
    }
}

#[tokio::test]
#[ignore = "requires DATABASE_URL and JWT_SECRET"]
async fn quota_outage_behavior_for_free_and_paid() {
    let ai = MockServer::start().await;
    Mock::given(method("POST"))
        .and(path("/v1/chat/completions"))
        .respond_with(ResponseTemplate::new(200).set_body_json(json!({
            "content": "ok",
            "model_used": "openai/gpt-4o-mini"
        })))
        .mount(&ai)
        .await;

    let state = integration_state(&ai.uri(), None).await;
    set_free_quota_config(&state, 1, 0, json!([])).await;
    let app = create_app(state.clone());

    let (free_token, free_user_id) =
        register_and_token(&app, &format!("quota-free-outage-{}@example.com", uuid::Uuid::new_v4())).await;
    let (free_status, free_payload) = post_authed_json(
        &app,
        &free_token,
        "/api/ai/chat",
        json!({"tool":"default","model":"openai/gpt-4o-mini","messages":[{"role":"user","content":"hi"}]}),
    )
    .await;
    assert_eq!(free_status, StatusCode::SERVICE_UNAVAILABLE);
    assert_eq!(free_payload["code"], "quota_backend_unavailable");

    let (paid_token, paid_user_id) =
        register_and_token(&app, &format!("quota-paid-outage-{}@example.com", uuid::Uuid::new_v4())).await;
    assert_ne!(free_user_id, paid_user_id);
    sqlx::query("UPDATE subscriptions SET tier = 'paid'::subscription_tier WHERE user_id = $1")
        .bind(paid_user_id)
        .execute(&state.pool)
        .await
        .expect("promote paid");

    let (paid_status, _) = post_authed_json(
        &app,
        &paid_token,
        "/api/ai/chat",
        json!({"tool":"default","model":"openai/gpt-4o-mini","messages":[{"role":"user","content":"hi"}]}),
    )
    .await;
    assert_eq!(paid_status, StatusCode::OK);
}

#[tokio::test]
#[ignore = "requires DATABASE_URL, JWT_SECRET, REDIS_URL"]
async fn free_model_bonus_is_not_applied_when_provider_is_not_openrouter() {
    let redis_url = std::env::var("REDIS_URL").expect("REDIS_URL");
    let ai = MockServer::start().await;
    Mock::given(method("POST"))
        .and(path("/v1/chat/completions"))
        .respond_with(ResponseTemplate::new(200).set_body_json(json!({
            "content": "ok",
            "model_used": "openai/gpt-4o-mini"
        })))
        .mount(&ai)
        .await;

    let state = integration_state(&ai.uri(), Some(&redis_url)).await;
    set_free_quota_config(&state, 1, 100, json!(["openai/gpt-4o-mini"])).await;
    set_ai_provider(&state, "anthropic").await;
    let app = create_app(state.clone());
    let (token, _) =
        register_and_token(&app, &format!("quota-provider-{}@example.com", uuid::Uuid::new_v4()))
            .await;

    let (s1, _) = post_authed_json(
        &app,
        &token,
        "/api/ai/chat",
        json!({"tool":"default","model":"openai/gpt-4o-mini","messages":[{"role":"user","content":"1"}]}),
    )
    .await;
    assert_eq!(s1, StatusCode::OK);

    let (s2, payload2) = post_authed_json(
        &app,
        &token,
        "/api/ai/chat",
        json!({"tool":"default","model":"openai/gpt-4o-mini","messages":[{"role":"user","content":"2"}]}),
    )
    .await;
    assert_eq!(s2, StatusCode::TOO_MANY_REQUESTS);
    assert_eq!(payload2["code"], "daily_quota_exceeded");
}

#[tokio::test]
#[ignore = "requires DATABASE_URL, JWT_SECRET, REDIS_URL"]
async fn chat_quota_ignores_arbitrary_context_model_field() {
    let redis_url = std::env::var("REDIS_URL").expect("REDIS_URL");
    let ai = MockServer::start().await;
    Mock::given(method("POST"))
        .and(path("/v1/chat/completions"))
        .respond_with(ResponseTemplate::new(200).set_body_json(json!({
            "content": "ok",
            "model_used": "openai/gpt-4o-mini"
        })))
        .mount(&ai)
        .await;

    let state = integration_state(&ai.uri(), Some(&redis_url)).await;
    set_free_quota_config(&state, 1, 2, json!(["openai/gpt-4o-mini"])).await;
    let app = create_app(state.clone());
    let (token, _) = register_and_token(
        &app,
        &format!("quota-context-ignore-{}@example.com", uuid::Uuid::new_v4()),
    )
    .await;

    let (s1, _) = post_authed_json(
        &app,
        &token,
        "/api/ai/chat",
        json!({"tool":"default","messages":[{"role":"user","content":"1"}],"context":{"model":"openai/gpt-4o-mini"}}),
    )
    .await;
    assert_eq!(s1, StatusCode::OK);

    let (s2, payload2) = post_authed_json(
        &app,
        &token,
        "/api/ai/chat",
        json!({"tool":"default","messages":[{"role":"user","content":"2"}],"context":{"model":"openai/gpt-4o-mini"}}),
    )
    .await;
    assert_eq!(s2, StatusCode::TOO_MANY_REQUESTS);
    assert_eq!(payload2["code"], "daily_quota_exceeded");
}

#[tokio::test]
#[ignore = "requires DATABASE_URL, JWT_SECRET, REDIS_URL"]
async fn failed_chat_upstream_does_not_consume_quota() {
    let redis_url = std::env::var("REDIS_URL").expect("REDIS_URL");
    let ai = MockServer::start().await;
    Mock::given(method("POST"))
        .and(path("/v1/chat/completions"))
        .respond_with(ResponseTemplate::new(502).set_body_string("bad gateway"))
        .up_to_n_times(1)
        .mount(&ai)
        .await;
    Mock::given(method("POST"))
        .and(path("/v1/chat/completions"))
        .respond_with(ResponseTemplate::new(200).set_body_json(json!({
            "content": "ok",
            "model_used": "openai/gpt-4o-mini"
        })))
        .mount(&ai)
        .await;

    let state = integration_state(&ai.uri(), Some(&redis_url)).await;
    set_free_quota_config(&state, 1, 0, json!([])).await;
    let app = create_app(state.clone());
    let (token, user_id) = register_and_token(
        &app,
        &format!("quota-chat-fail-{}@example.com", uuid::Uuid::new_v4()),
    )
    .await;

    let (first_status, _) = post_authed_json(
        &app,
        &token,
        "/api/ai/chat",
        json!({"tool":"default","model":"openai/gpt-4o-mini","messages":[{"role":"user","content":"1"}]}),
    )
    .await;
    assert_eq!(first_status, StatusCode::BAD_GATEWAY);
    tokio::time::sleep(Duration::from_millis(60)).await;

    let (second_status, _) = post_authed_json(
        &app,
        &token,
        "/api/ai/chat",
        json!({"tool":"default","model":"openai/gpt-4o-mini","messages":[{"role":"user","content":"2"}]}),
    )
    .await;
    assert_eq!(second_status, StatusCode::OK);

    let window = backend::usage_quota::utc_daily_window(user_id, chrono::Utc::now());
    let mut conn = state.redis.as_ref().expect("redis").clone();
    let current: Option<u32> = redis::cmd("GET")
        .arg(window.redis_key)
        .query_async(&mut conn)
        .await
        .expect("redis get");
    assert_eq!(current, Some(1));
}

#[tokio::test]
#[ignore = "requires DATABASE_URL, JWT_SECRET, REDIS_URL"]
async fn failed_niche_upstream_does_not_consume_quota() {
    let redis_url = std::env::var("REDIS_URL").expect("REDIS_URL");
    let ai = MockServer::start().await;
    Mock::given(method("POST"))
        .and(path("/v1/analysis/niche"))
        .respond_with(ResponseTemplate::new(503).set_body_string("service unavailable"))
        .up_to_n_times(1)
        .mount(&ai)
        .await;
    Mock::given(method("POST"))
        .and(path("/v1/analysis/niche"))
        .respond_with(ResponseTemplate::new(200).set_body_json(json!({
            "matches": [],
            "summary": "ok"
        })))
        .mount(&ai)
        .await;

    let state = integration_state(&ai.uri(), Some(&redis_url)).await;
    set_free_quota_config(&state, 1, 0, json!([])).await;
    let app = create_app(state.clone());
    let (token, user_id) = register_and_token(
        &app,
        &format!("quota-niche-fail-{}@example.com", uuid::Uuid::new_v4()),
    )
    .await;

    let (first_status, _) = post_authed_json(
        &app,
        &token,
        "/api/ai/niche",
        json!({"query":"wireless mouse","limit":5}),
    )
    .await;
    assert_eq!(first_status, StatusCode::SERVICE_UNAVAILABLE);
    tokio::time::sleep(Duration::from_millis(60)).await;

    let (second_status, _) = post_authed_json(
        &app,
        &token,
        "/api/ai/niche",
        json!({"query":"wireless mouse","limit":5}),
    )
    .await;
    assert_eq!(second_status, StatusCode::OK);

    let window = backend::usage_quota::utc_daily_window(user_id, chrono::Utc::now());
    let mut conn = state.redis.as_ref().expect("redis").clone();
    let current: Option<u32> = redis::cmd("GET")
        .arg(window.redis_key)
        .query_async(&mut conn)
        .await
        .expect("redis get");
    assert_eq!(current, Some(1));
}

#[tokio::test]
#[ignore = "requires DATABASE_URL and JWT_SECRET"]
async fn cli_style_update_roundtrip_updates_config_and_audit() {
    let state = app_state_from_env().await.expect("app state");
    let key = "free_daily_quota_base";
    let before = backend::config::get_config_value(&state.pool, key)
        .await
        .expect("read existing value");
    let target = serde_json::json!(33);

    backend::config::apply_config_updates(
        &state.pool,
        vec![(key.to_string(), target.clone())],
        "test-cli",
    )
    .await
    .expect("apply update");

    let after = backend::config::get_config_value(&state.pool, key)
        .await
        .expect("read updated value");
    assert_eq!(after, target);

    let audit_row = sqlx::query(
        "SELECT key, old_value, new_value, actor
         FROM app_config_audit
         WHERE key = $1
         ORDER BY id DESC
         LIMIT 1",
    )
    .bind(key)
    .fetch_one(&state.pool)
    .await
    .expect("audit row");
    let audit_key: String = audit_row.try_get("key").expect("audit key");
    let old_value: Value = audit_row.try_get("old_value").expect("old value");
    let new_value: Value = audit_row.try_get("new_value").expect("new value");
    let actor: String = audit_row.try_get("actor").expect("actor");
    assert_eq!(audit_key, key);
    assert_eq!(old_value, before);
    assert_eq!(new_value, target);
    assert_eq!(actor, "test-cli");

    backend::config::apply_config_updates(
        &state.pool,
        vec![(key.to_string(), before)],
        "test-cli-restore",
    )
    .await
    .expect("restore prior value");
}

#[tokio::test]
#[ignore = "requires DATABASE_URL and JWT_SECRET"]
async fn set_many_is_atomic() {
    let state = app_state_from_env().await.expect("app state");
    let key_a = "free_daily_quota_base";
    let key_b = "ai_provider";
    let original_a = backend::config::get_config_value(&state.pool, key_a)
        .await
        .expect("read original A");
    let original_b = backend::config::get_config_value(&state.pool, key_b)
        .await
        .expect("read original B");

    let err = backend::config::apply_config_updates(
        &state.pool,
        vec![
            (key_a.to_string(), serde_json::json!(41)),
            (key_b.to_string(), serde_json::json!(12345)),
        ],
        "test-cli-atomic",
    )
    .await
    .expect_err("invalid batch should fail as one transaction");
    assert!(
        err.to_string().contains("config key must be string: ai_provider"),
        "unexpected error: {err}"
    );

    let current_a = backend::config::get_config_value(&state.pool, key_a)
        .await
        .expect("read A after failed transaction");
    let current_b = backend::config::get_config_value(&state.pool, key_b)
        .await
        .expect("read B after failed transaction");
    assert_eq!(current_a, original_a);
    assert_eq!(current_b, original_b);
}

#[tokio::test]
#[ignore = "requires DATABASE_URL and JWT_SECRET"]
async fn writes_audit_actor_and_old_new_values() {
    let state = app_state_from_env().await.expect("app state");
    let key = "paid_daily_quota";
    let before = backend::config::get_config_value(&state.pool, key)
        .await
        .expect("read original");
    let target = serde_json::json!(77);

    backend::config::apply_config_updates(
        &state.pool,
        vec![(key.to_string(), target.clone())],
        "quota-admin@example",
    )
    .await
    .expect("apply change");

    let audit = sqlx::query(
        "SELECT actor, old_value, new_value
         FROM app_config_audit
         WHERE key = $1
         ORDER BY id DESC
         LIMIT 1",
    )
    .bind(key)
    .fetch_one(&state.pool)
    .await
    .expect("latest audit row");
    let actor: String = audit.try_get("actor").expect("actor");
    let old_value: Value = audit.try_get("old_value").expect("old");
    let new_value: Value = audit.try_get("new_value").expect("new");
    assert_eq!(actor, "quota-admin@example");
    assert_eq!(old_value, before);
    assert_eq!(new_value, target);

    backend::config::apply_config_updates(
        &state.pool,
        vec![(key.to_string(), before)],
        "test-cli-restore",
    )
    .await
    .expect("restore original");
}

#[tokio::test]
#[ignore = "requires DATABASE_URL and JWT_SECRET"]
async fn rejects_oversized_niche_query() {
    let state = integration_state("http://127.0.0.1:9", None).await;
    let app = create_app(state.clone());
    let (token, _) = register_and_token(
        &app,
        &format!("niche-oversized-{}@example.com", uuid::Uuid::new_v4()),
    )
    .await;

    let oversized_query = "a".repeat(301);
    let (status, payload) = post_authed_json(
        &app,
        &token,
        "/api/ai/niche",
        json!({ "query": oversized_query, "limit": 5 }),
    )
    .await;

    assert_eq!(status, StatusCode::BAD_REQUEST);
    assert_eq!(payload["error"], "query must be 1..=300 characters");
}

#[tokio::test]
#[ignore = "requires DATABASE_URL and JWT_SECRET"]
async fn rejects_oversized_chat_message_content() {
    let state = integration_state("http://127.0.0.1:9", None).await;
    let app = create_app(state.clone());
    let (token, _) = register_and_token(
        &app,
        &format!("chat-oversized-{}@example.com", uuid::Uuid::new_v4()),
    )
    .await;

    let oversized_content = "x".repeat(4_001);
    let (status, payload) = post_authed_json(
        &app,
        &token,
        "/api/ai/chat",
        json!({
            "tool": "default",
            "messages": [{ "role": "user", "content": oversized_content }]
        }),
    )
    .await;

    assert_eq!(status, StatusCode::BAD_REQUEST);
    assert_eq!(
        payload["error"],
        "message[0].content must be at most 4000 characters"
    );
}

#[tokio::test]
#[ignore = "requires DATABASE_URL and JWT_SECRET"]
async fn config_queries_reject_sql_injection_payloads_via_bound_params() {
    let state = app_state_from_env().await.expect("app state");
    let sql_injection_key = "free_daily_quota_base' OR '1'='1";

    let err = backend::config::get_config_value(&state.pool, sql_injection_key)
        .await
        .expect_err("invalid key should be rejected");
    assert!(
        err.to_string()
            .contains("config key contains invalid characters"),
        "unexpected error: {err}"
    );

    let cfg = state.runtime_config().await.expect("runtime config still readable");
    assert!(cfg.free_daily_quota_base > 0);
}

#[tokio::test]
#[ignore = "requires DATABASE_URL, JWT_SECRET, REDIS_URL"]
async fn chat_success_includes_quota_usage_headers_when_quota_active() {
    let redis_url = std::env::var("REDIS_URL").expect("REDIS_URL");
    let ai = MockServer::start().await;
    Mock::given(method("POST"))
        .and(path("/v1/chat/completions"))
        .respond_with(ResponseTemplate::new(200).set_body_json(json!({
            "content": "ok",
            "model_used": "openai/gpt-4o-mini"
        })))
        .mount(&ai)
        .await;

    let state = integration_state(&ai.uri(), Some(&redis_url)).await;
    set_ai_provider(&state, "openrouter").await;
    sqlx::query("UPDATE app_config SET value_json = to_jsonb($1::text) WHERE key = 'ai_default_model_id'")
        .bind("openai/gpt-4o-mini")
        .execute(&state.pool)
        .await
        .expect("update ai default model");
    set_free_quota_config(&state, 1, 0, json!(["openai/gpt-4o-mini"])).await;

    let app = create_app(state.clone());
    let (token, _) = register_and_token(
        &app,
        &format!("quota-headers-chat-{}@example.com", uuid::Uuid::new_v4()),
    )
    .await;

    let (status, _, headers) = post_authed_json_with_headers(
        &app,
        &token,
        "/api/ai/chat",
        json!({"tool":"default","messages":[{"role":"user","content":"hi"}]}),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(headers.get("x-quota-used").and_then(|v| v.to_str().ok()), Some("1"));
    assert_eq!(
        headers.get("x-quota-limit").and_then(|v| v.to_str().ok()),
        Some("1")
    );
}

#[tokio::test]
#[ignore = "requires DATABASE_URL, JWT_SECRET, REDIS_URL"]
async fn niche_success_includes_quota_usage_headers_when_quota_active() {
    let redis_url = std::env::var("REDIS_URL").expect("REDIS_URL");
    let ai = MockServer::start().await;
    Mock::given(method("POST"))
        .and(path("/v1/analysis/niche"))
        .respond_with(ResponseTemplate::new(200).set_body_json(json!({
            "matches": [],
            "summary": "ok"
        })))
        .mount(&ai)
        .await;

    let state = integration_state(&ai.uri(), Some(&redis_url)).await;
    set_ai_provider(&state, "openrouter").await;
    sqlx::query("UPDATE app_config SET value_json = to_jsonb($1::text) WHERE key = 'ai_default_model_id'")
        .bind("openai/gpt-4o-mini")
        .execute(&state.pool)
        .await
        .expect("update ai default model");
    set_free_quota_config(&state, 2, 0, json!(["openai/gpt-4o-mini"])).await;

    let app = create_app(state.clone());
    let (token, _) = register_and_token(
        &app,
        &format!("quota-headers-niche-{}@example.com", uuid::Uuid::new_v4()),
    )
    .await;

    let (status, _, headers) = post_authed_json_with_headers(
        &app,
        &token,
        "/api/ai/niche",
        json!({"query":"wireless mouse","limit":5}),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(headers.get("x-quota-used").and_then(|v| v.to_str().ok()), Some("1"));
    assert_eq!(
        headers.get("x-quota-limit").and_then(|v| v.to_str().ok()),
        Some("2")
    );
}
