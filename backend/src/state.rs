use std::sync::Arc;

use redis::aio::ConnectionManager;
use sqlx::PgPool;

use crate::auth::JwtConfig;
use crate::marketplace::MarketplaceRateConfig;

/// HTTP-layer subscription limits (our product, not marketplace APIs).
#[derive(Debug, Clone, Copy)]
pub struct SubscriptionLimits {
    pub max_api_keys_free: i64,
    pub max_api_keys_paid: i64,
}

impl Default for SubscriptionLimits {
    fn default() -> Self {
        Self {
            max_api_keys_free: 2,
            max_api_keys_paid: 100,
        }
    }
}

#[derive(Clone)]
pub struct AppState {
    pub pool: PgPool,
    pub jwt: JwtConfig,
    pub redis: Option<ConnectionManager>,
    pub http_client: reqwest::Client,
    pub limits: SubscriptionLimits,
    pub wb_rates: Arc<MarketplaceRateConfig>,
    pub ozon_rates: Arc<MarketplaceRateConfig>,
}

impl AppState {
    pub fn max_api_keys_for_tier(&self, paid: bool) -> i64 {
        if paid {
            self.limits.max_api_keys_paid
        } else {
            self.limits.max_api_keys_free
        }
    }
}
