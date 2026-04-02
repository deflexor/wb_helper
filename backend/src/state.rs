use std::sync::Arc;
use std::time::{Duration, Instant};

use redis::aio::ConnectionManager;
use sqlx::PgPool;
use tokio::sync::RwLock;

use crate::auth::JwtConfig;
use crate::config::{load_runtime_config, RuntimeConfig};
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
    /// Base URL for the Python AI service (e.g. `http://127.0.0.1:8000`). When unset, AI proxy routes return 503.
    pub ai_service_url: Option<String>,
    pub ai_service_internal_key: Option<String>,
    pub runtime_config_cache: RuntimeConfigCache,
}

#[derive(Clone)]
pub struct RuntimeConfigCache {
    ttl: Duration,
    entry: Arc<RwLock<RuntimeConfigCacheEntry>>,
}

#[derive(Clone, Default)]
struct RuntimeConfigCacheEntry {
    loaded_at: Option<Instant>,
    config: Option<RuntimeConfig>,
}

impl AppState {
    pub fn max_api_keys_for_tier(&self, paid: bool) -> i64 {
        if paid {
            self.limits.max_api_keys_paid
        } else {
            self.limits.max_api_keys_free
        }
    }

    pub async fn runtime_config(&self) -> Result<RuntimeConfig, sqlx::Error> {
        self.runtime_config_cache.get_or_load(&self.pool).await
    }
}

impl RuntimeConfigCache {
    pub fn new(ttl: Duration) -> Self {
        Self {
            ttl,
            entry: Arc::new(RwLock::new(RuntimeConfigCacheEntry::default())),
        }
    }

    pub async fn get_or_load(&self, pool: &PgPool) -> Result<RuntimeConfig, sqlx::Error> {
        {
            let guard = self.entry.read().await;
            if let (Some(loaded_at), Some(config)) = (guard.loaded_at, guard.config.as_ref()) {
                if loaded_at.elapsed() < self.ttl {
                    return Ok(config.clone());
                }
            }
        }

        let refreshed = match load_runtime_config(pool).await {
            Ok(value) => value,
            Err(err) => {
                let guard = self.entry.read().await;
                if let Some(config) = guard.config.as_ref() {
                    tracing::warn!(
                        error = %err,
                        "runtime config refresh failed; returning stale cached config"
                    );
                    return Ok(config.clone());
                }
                return Err(err);
            }
        };
        let mut guard = self.entry.write().await;
        if let (Some(loaded_at), Some(config)) = (guard.loaded_at, guard.config.as_ref()) {
            if loaded_at.elapsed() < self.ttl {
                return Ok(config.clone());
            }
        }
        guard.loaded_at = Some(Instant::now());
        guard.config = Some(refreshed.clone());
        Ok(refreshed)
    }

    pub fn ttl(&self) -> Duration {
        self.ttl
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::postgres::PgPoolOptions;

    fn sample_runtime_config() -> RuntimeConfig {
        RuntimeConfig {
            free_daily_quota_base: 25,
            free_daily_quota_free_model_bonus: 15,
            free_openrouter_model_allowlist: vec!["openai/gpt-4o-mini".to_string()],
            ai_provider: "openrouter".to_string(),
            ai_default_model_id: "openai/gpt-4o-mini".to_string(),
            paid_daily_quota: None,
        }
    }

    #[tokio::test]
    async fn warm_cache_loader_failure_returns_cached_config() {
        let cache = RuntimeConfigCache::new(Duration::from_millis(1));
        let cached = sample_runtime_config();
        {
            let mut guard = cache.entry.write().await;
            guard.loaded_at = Some(Instant::now() - Duration::from_secs(5));
            guard.config = Some(cached.clone());
        }

        let pool = PgPoolOptions::new()
            .max_connections(1)
            .connect_lazy("postgres://invalid:invalid@127.0.0.1:1/invalid")
            .expect("lazy pool");

        let result = cache.get_or_load(&pool).await.expect("stale cache fallback");
        assert_eq!(result, cached);
    }

    #[tokio::test]
    async fn cold_cache_loader_failure_returns_error() {
        let cache = RuntimeConfigCache::new(Duration::from_secs(30));
        let pool = PgPoolOptions::new()
            .max_connections(1)
            .connect_lazy("postgres://invalid:invalid@127.0.0.1:1/invalid")
            .expect("lazy pool");

        let result = cache.get_or_load(&pool).await;
        assert!(result.is_err(), "cold cache should surface loader error");
    }
}
