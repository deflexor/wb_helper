//! Integration test: public hello endpoint (TDD — must fail until route exists).

use axum::body::Body;
use axum::http::{Request, StatusCode};
use backend::create_app;
use http_body_util::BodyExt;
use tower::ServiceExt;

#[tokio::test]
async fn get_api_hello_returns_json_welcome_message() {
    let app = create_app();

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
