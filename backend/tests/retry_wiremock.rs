//! Integration-style test for [`backend::retry::execute_with_retry`] against Wiremock.

use std::time::Duration;

use backend::retry::execute_with_retry;
use wiremock::matchers::{method, path};
use wiremock::{Mock, MockServer, ResponseTemplate};

#[tokio::test]
async fn execute_with_retry_returns_last_response_when_always_502() {
    let srv = MockServer::start().await;
    Mock::given(method("GET"))
        .and(path("/unstable"))
        .respond_with(ResponseTemplate::new(502))
        .mount(&srv)
        .await;

    let url = format!("{}/unstable", srv.uri());
    let http = reqwest::Client::new();
    let response = execute_with_retry(
        move || {
            let http = http.clone();
            let url = url.clone();
            async move { http.get(&url).send().await }
        },
        2,
        Duration::from_millis(1),
        Duration::from_millis(10),
    )
    .await
    .unwrap();

    assert_eq!(response.status(), 502);
}
