//! Ozon Seller API uses `Client-Id` and `Api-Key` on each request.
//!
//! Docs: <https://docs.ozon.ru/api/seller/>

use std::sync::Arc;
use std::time::Duration;

use serde_json::{json, Value};
use thiserror::Error;
use url::Url;

use crate::rate_limit::KeyedTokenBuckets;
use crate::retry::execute_with_retry;

use super::MarketplaceRateConfig;

const DEFAULT_BASE: &str = "https://api-seller.ozon.ru";

#[derive(Clone)]
pub struct OzonClient {
    http: reqwest::Client,
    base: Url,
    limiter: Arc<KeyedTokenBuckets<String>>,
}

#[derive(Debug, Error)]
pub enum OzonError {
    #[error("http: {0}")]
    Http(#[from] reqwest::Error),
    #[error("url: {0}")]
    Url(#[from] url::ParseError),
    #[error("ozon API status {0}")]
    ApiStatus(reqwest::StatusCode),
}

impl OzonClient {
    pub fn new(http: reqwest::Client, rates: Arc<MarketplaceRateConfig>) -> Result<Self, OzonError> {
        Self::with_base(http, rates, DEFAULT_BASE)
    }

    pub fn with_base(
        http: reqwest::Client,
        rates: Arc<MarketplaceRateConfig>,
        base: &str,
    ) -> Result<Self, OzonError> {
        Ok(Self {
            http,
            base: Url::parse(base)?,
            limiter: Arc::new(KeyedTokenBuckets::new(
                rates.bucket_capacity,
                rates.bucket_refill_per_sec,
            )),
        })
    }

    /// Product list (`POST /v2/product/list`) — see Ozon Seller API reference.
    pub async fn list_products_page(
        &self,
        rate_key: &str,
        client_id: &str,
        api_key: &str,
        limit: u32,
    ) -> Result<Value, OzonError> {
        self.limiter.acquire_one(rate_key.to_string()).await;
        let url = self.base.join("v2/product/list")?;

        let http = self.http.clone();
        let url_clone = url.clone();
        let cid = client_id.to_string();
        let key = api_key.to_string();
        let limit = limit.min(1000);
        let response = execute_with_retry(
            || {
                let http = http.clone();
                let url = url_clone.clone();
                let cid = cid.clone();
                let key = key.clone();
                let limit = limit;
                async move {
                    let body = json!({
                        "filter": {},
                        "last_id": "",
                        "limit": limit
                    });
                    http.post(url)
                        .header("Client-Id", cid)
                        .header("Api-Key", key)
                        .json(&body)
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
            return Err(OzonError::ApiStatus(status));
        }
        Ok(response.json().await?)
    }
}
