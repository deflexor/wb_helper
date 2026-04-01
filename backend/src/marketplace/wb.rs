//! Wildberries supplier/content APIs use bearer tokens; hosts vary by product area.
//!
//! Docs: <https://dev.wildberries.ru/docs/openapi/api-information>

use std::sync::Arc;
use std::time::Duration;

use serde_json::Value;
use thiserror::Error;
use url::Url;

use crate::rate_limit::KeyedTokenBuckets;
use crate::retry::execute_with_retry;

use super::MarketplaceRateConfig;

const DEFAULT_BASE: &str = "https://suppliers-api.wildberries.ru";

#[derive(Clone)]
pub struct WbClient {
    http: reqwest::Client,
    base: Url,
    limiter: Arc<KeyedTokenBuckets<String>>,
}

#[derive(Debug, Error)]
pub enum WbError {
    #[error("http: {0}")]
    Http(#[from] reqwest::Error),
    #[error("url: {0}")]
    Url(#[from] url::ParseError),
    #[error("wb API status {0}")]
    ApiStatus(reqwest::StatusCode),
}

impl WbClient {
    pub fn new(http: reqwest::Client, rates: Arc<MarketplaceRateConfig>) -> Result<Self, WbError> {
        Self::with_base(http, rates, DEFAULT_BASE)
    }

    pub fn with_base(
        http: reqwest::Client,
        rates: Arc<MarketplaceRateConfig>,
        base: &str,
    ) -> Result<Self, WbError> {
        Ok(Self {
            http,
            base: Url::parse(base)?,
            limiter: Arc::new(KeyedTokenBuckets::new(
                rates.bucket_capacity,
                rates.bucket_refill_per_sec,
            )),
        })
    }

    /// Example call: seller info (`GET /public/api/v1/info`). See WB OpenAPI for current paths.
    pub async fn get_seller_info(&self, rate_key: &str, api_token: &str) -> Result<Value, WbError> {
        self.limiter.acquire_one(rate_key.to_string()).await;
        let url = self.base.join("public/api/v1/info")?;

        let http = self.http.clone();
        let token = api_token.to_string();
        let response = execute_with_retry(
            || {
                let http = http.clone();
                let url = url.clone();
                let token = token.clone();
                async move {
                    http.get(url)
                        .header("Authorization", token)
                        .send()
                        .await
                }
            },
            4,
            Duration::from_millis(100),
            Duration::from_secs(5),
        )
        .await?;

        let status = response.status();
        if !status.is_success() {
            return Err(WbError::ApiStatus(status));
        }
        Ok(response.json().await?)
    }
}
