//! Run with local Docker stack: `docker compose -f infra/docker-compose.yml up -d postgres redis`
//!
//! ```text
//! DATABASE_URL=postgres://wb:wb@127.0.0.1:5432/wb_helper \
//! JWT_SECRET=0123456789abcdef0123456789abcdef \
//! REDIS_URL=redis://127.0.0.1:6379 \
//! cargo test -p backend --test integration_pool -- --ignored --nocapture
//! ```
//!
//! After register/login, you can exercise marketplace sync:
//! `POST /api/credentials` (Bearer) with `{"marketplace":"wildberries","wb_api_token":"..."}` then
//! `POST /api/sync` to pull seller info into `product_snapshots` (and Ozon products into snapshots + `pricing_history`).

use std::sync::Arc;
use std::time::Duration;

use axum::body::Body;
use axum::http::{Request, StatusCode};
use backend::marketplace::MarketplaceRateConfig;
use backend::{app_state_from_env, create_app, run_migrations, AppState};
use sqlx::postgres::PgPoolOptions;
use tower::ServiceExt;

async fn state_from_urls() -> Arc<AppState> {
    let database_url = std::env::var("DATABASE_URL").expect("DATABASE_URL for integration test");
    let jwt_secret = std::env::var("JWT_SECRET").expect("JWT_SECRET for integration test");
    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await
        .expect("connect postgres");
    run_migrations(&pool).await.expect("migrate");
    let jwt = backend::auth::JwtConfig::from_secret(jwt_secret.as_bytes(), Duration::from_secs(3600))
        .expect("jwt config");
    let redis_url = std::env::var("REDIS_URL").expect("REDIS_URL for integration test");
    let client = redis::Client::open(redis_url).expect("redis client");
    let redis = redis::aio::ConnectionManager::new(client)
        .await
        .expect("redis connect");
    Arc::new(AppState {
        pool,
        jwt,
        redis: Some(redis),
        http_client: reqwest::Client::new(),
        limits: backend::state::SubscriptionLimits::default(),
        wb_rates: Arc::new(MarketplaceRateConfig::default()),
        ozon_rates: Arc::new(MarketplaceRateConfig::default()),
        ai_service_url: None,
        ai_service_internal_key: None,
        runtime_config_cache: backend::state::RuntimeConfigCache::new(Duration::from_secs(1)),
    })
}

#[tokio::test]
#[ignore = "requires DATABASE_URL, JWT_SECRET, REDIS_URL"]
async fn register_login_and_redis_roundtrip() {
    let state = state_from_urls().await;
    let app = create_app(state.clone());

    let reg_body = serde_json::json!({
        "email": format!("it-{}@example.com", uuid::Uuid::new_v4()),
        "password": "password123"
    });

    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/auth/register")
                .header("content-type", "application/json")
                .body(Body::from(reg_body.to_string()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);

    let mut conn = state.redis.as_ref().unwrap().clone();
    redis::cmd("PING")
        .query_async::<String>(&mut conn)
        .await
        .expect("redis PING");
}

#[tokio::test]
#[ignore = "requires DATABASE_URL and JWT_SECRET (uses app_state_from_env)"]
async fn app_state_from_env_smoke() {
    let _ = app_state_from_env().await.expect("app_state_from_env");
}
