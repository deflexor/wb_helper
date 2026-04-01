//! Wiremock-based tests for marketplace HTTP clients.

use std::sync::Arc;

use backend::marketplace::{MarketplaceRateConfig, OzonClient, WbClient};
use serde_json::json;
use wiremock::matchers::{method, path};
use wiremock::{Mock, MockServer, ResponseTemplate};

fn fast_rates() -> Arc<MarketplaceRateConfig> {
    Arc::new(MarketplaceRateConfig {
        bucket_capacity: 50.0,
        bucket_refill_per_sec: 100.0,
    })
}

#[tokio::test]
async fn wb_get_seller_info_parses_json() {
    let srv = MockServer::start().await;
    Mock::given(method("GET"))
        .and(path("/public/api/v1/info"))
        .respond_with(ResponseTemplate::new(200).set_body_json(json!({ "name": "test-seller" })))
        .mount(&srv)
        .await;

    let client = WbClient::with_base(reqwest::Client::new(), fast_rates(), &srv.uri()).unwrap();
    let v = client.get_seller_info("user-1", "dummy-token").await.unwrap();
    assert_eq!(v["name"], "test-seller");
}

#[tokio::test]
async fn ozon_list_products_parses_json() {
    let srv = MockServer::start().await;
    Mock::given(method("POST"))
        .and(path("/v2/product/list"))
        .respond_with(ResponseTemplate::new(200).set_body_json(json!({ "result": { "items": [] } })))
        .mount(&srv)
        .await;

    let client = OzonClient::with_base(reqwest::Client::new(), fast_rates(), &srv.uri()).unwrap();
    let v = client
        .list_products_page("user-1", "cid", "key")
        .await
        .unwrap();
    assert!(v.get("result").is_some());
}
