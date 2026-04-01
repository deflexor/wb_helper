//! Integration test: public hello endpoint (TDD — must fail until route exists).

use std::sync::Arc;
use std::time::Duration;

use axum::body::Body;
use axum::http::{Request, StatusCode};
use backend::marketplace::MarketplaceRateConfig;
use backend::{create_app, AppState};
use http_body_util::BodyExt;
use sqlx::postgres::PgPoolOptions;
use tower::ServiceExt;

fn test_state() -> Arc<AppState> {
    let pool = PgPoolOptions::new()
        .max_connections(1)
        .connect_lazy("postgres://wb:wb@127.0.0.1:5432/wb_helper")
        .expect("lazy pool url");
    let jwt =
        backend::auth::JwtConfig::from_secret(b"0123456789abcdef0123456789abcdef", Duration::from_secs(60))
            .unwrap();
    Arc::new(AppState {
        pool,
        jwt,
        redis: None,
        limits: backend::state::SubscriptionLimits::default(),
        wb_rates: Arc::new(MarketplaceRateConfig::default()),
        ozon_rates: Arc::new(MarketplaceRateConfig::default()),
    })
}

#[tokio::test]
async fn get_api_hello_returns_json_welcome_message() {
    let app = create_app(test_state());

    let response = app
        .oneshot(
            Request::builder()
                .uri("/api/hello")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .expect("request completes");

    assert_eq!(response.status(), StatusCode::OK);

    let body = response
        .into_body()
        .collect()
        .await
        .expect("body loads")
        .to_bytes();
    let value: serde_json::Value = serde_json::from_slice(&body).expect("valid JSON");
    assert_eq!(value["message"], "Welcome to WB Helper API");
}
