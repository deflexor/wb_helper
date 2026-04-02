//! HTTP API application (Axum) — Phase 2: auth, marketplace clients, rate limiting.

use std::sync::Arc;
use std::time::Duration;

use axum::middleware::from_fn_with_state;
use axum::routing::{get, post};
use axum::{Json, Router};
use serde::Serialize;
use sqlx::postgres::PgPoolOptions;
use sqlx::PgPool;

pub mod ai_contract;
pub mod ai_proxy;
pub mod auth;
pub mod cache;
pub mod config;
pub mod marketplace;
pub mod models;
pub mod rate_limit;
pub mod retry;
pub mod state;
pub mod sync;
pub mod usage_quota;

pub use state::AppState;

use auth::handlers;
use auth::jwt_auth_middleware;
use marketplace::MarketplaceRateConfig;
use state::RuntimeConfigCache;

#[derive(Serialize)]
struct HelloResponse {
    message: &'static str,
}

async fn api_hello() -> Json<HelloResponse> {
    Json(HelloResponse {
        message: "Welcome to WB Helper API",
    })
}

/// Builds the Axum router with [`AppState`] applied (`Router<()>` for [`axum::serve`]).
pub fn create_app(state: Arc<AppState>) -> Router<()> {
    let auth_state = state.clone();
    let protected = Router::new()
        .route("/me", get(handlers::me))
        .route("/keys", post(handlers::create_api_key))
        .route("/credentials", get(sync::list_credentials).post(sync::upsert_credential))
        .route("/sync", post(sync::run_sync))
        .route("/ai/chat", post(ai_proxy::proxy_chat))
        .route("/ai/niche", post(ai_proxy::proxy_niche))
        .route_layer(from_fn_with_state(auth_state, jwt_auth_middleware));

    Router::new()
        .route("/api/hello", get(api_hello))
        .route("/api/auth/register", post(handlers::register))
        .route("/api/auth/login", post(handlers::login))
        .nest("/api", protected)
        .with_state(state)
}

/// Run SQL migrations from `./migrations` (relative to `CARGO_MANIFEST_DIR` at compile time).
pub async fn run_migrations(pool: &PgPool) -> Result<(), sqlx::migrate::MigrateError> {
    sqlx::migrate!("./migrations").run(pool).await
}

/// Connect to Postgres and apply defaults for JWT / rate limits.
pub async fn app_state_from_env() -> Result<Arc<AppState>, std::io::Error> {
    let database_url = std::env::var("DATABASE_URL").map_err(|e| {
        std::io::Error::new(
            std::io::ErrorKind::InvalidInput,
            format!("DATABASE_URL: {e}"),
        )
    })?;
    let jwt_secret = std::env::var("JWT_SECRET").map_err(|e| {
        std::io::Error::new(
            std::io::ErrorKind::InvalidInput,
            format!("JWT_SECRET: {e}"),
        )
    })?;
    let pool = PgPoolOptions::new()
        .max_connections(10)
        .connect(&database_url)
        .await
        .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e))?;

    run_migrations(&pool).await.map_err(|e| {
        std::io::Error::new(std::io::ErrorKind::Other, format!("migrate: {e}"))
    })?;

    let jwt = auth::JwtConfig::from_secret(jwt_secret.as_bytes(), Duration::from_secs(86_400))
        .map_err(|e| std::io::Error::new(std::io::ErrorKind::InvalidInput, e))?;

    let redis = if let Ok(url) = std::env::var("REDIS_URL") {
        let client = redis::Client::open(url).map_err(|e| {
            std::io::Error::new(std::io::ErrorKind::InvalidInput, e)
        })?;
        Some(
            redis::aio::ConnectionManager::new(client)
                .await
                .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e))?,
        )
    } else {
        None
    };

    let wb_rates = Arc::new(MarketplaceRateConfig::default());
    let ozon_rates = Arc::new(MarketplaceRateConfig::default());

    let http_client = reqwest::Client::builder()
        .timeout(Duration::from_secs(60))
        .build()
        .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e))?;

    let ai_service_url = std::env::var("AI_SERVICE_URL")
        .ok()
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty());
    let ai_service_internal_key = std::env::var("AI_SERVICE_INTERNAL_KEY")
        .ok()
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty());

    let runtime_config_cache = RuntimeConfigCache::new(Duration::from_secs(30));

    let state = Arc::new(AppState {
        pool,
        jwt,
        redis,
        http_client,
        limits: state::SubscriptionLimits::default(),
        wb_rates,
        ozon_rates,
        ai_service_url,
        ai_service_internal_key,
        runtime_config_cache,
    });
    state.runtime_config().await.map_err(|e| {
        std::io::Error::new(std::io::ErrorKind::Other, format!("runtime config load: {e}"))
    })?;
    Ok(state)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn create_app_builds_router() {
        let pool = PgPoolOptions::new()
            .max_connections(1)
            .connect_lazy("postgres://wb:wb@127.0.0.1:5432/wb_helper")
            .expect("lazy pool url");
        let jwt =
            auth::JwtConfig::from_secret(b"0123456789abcdef0123456789abcdef", Duration::from_secs(60))
                .unwrap();
        let state = Arc::new(AppState {
            pool,
            jwt,
            redis: None,
            http_client: reqwest::Client::new(),
            limits: state::SubscriptionLimits::default(),
            wb_rates: Arc::new(MarketplaceRateConfig::default()),
            ozon_rates: Arc::new(MarketplaceRateConfig::default()),
            ai_service_url: None,
            ai_service_internal_key: None,
            runtime_config_cache: RuntimeConfigCache::new(Duration::from_secs(30)),
        });
        let _ = create_app(state);
    }
}
