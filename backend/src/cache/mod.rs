//! Redis JSON cache helpers.

use std::future::Future;

use redis::AsyncCommands;
use serde::{de::DeserializeOwned, Serialize};
use thiserror::Error;

#[derive(Clone)]
pub struct RedisJsonCache {
    redis: redis::aio::ConnectionManager,
}

impl RedisJsonCache {
    pub fn new(redis: redis::aio::ConnectionManager) -> Self {
        Self { redis }
    }

    pub async fn get_json<T: DeserializeOwned>(&self, key: &str) -> Result<Option<T>, CacheError> {
        let mut conn = self.redis.clone();
        let raw: Option<String> = conn.get(key).await?;
        match raw {
            None => Ok(None),
            Some(s) => Ok(Some(serde_json::from_str(&s)?)),
        }
    }

    pub async fn set_json<T: Serialize + Sync>(
        &self,
        key: &str,
        value: &T,
        ttl_secs: u64,
    ) -> Result<(), CacheError> {
        let mut conn = self.redis.clone();
        let payload = serde_json::to_string(value)?;
        redis::cmd("SETEX")
            .arg(key)
            .arg(ttl_secs as i64)
            .arg(payload)
            .query_async::<()>(&mut conn)
            .await?;
        Ok(())
    }

    /// Read-through cache: returns cached JSON or runs `fetch`, stores with TTL.
    pub async fn get_or_fetch_json<T, F, Fut>(
        &self,
        key: &str,
        ttl_secs: u64,
        fetch: F,
    ) -> Result<T, CacheError>
    where
        T: Serialize + DeserializeOwned + Send + Sync,
        F: FnOnce() -> Fut,
        Fut: Future<Output = Result<T, CacheError>>,
    {
        if let Some(v) = self.get_json::<T>(key).await? {
            return Ok(v);
        }
        let v = fetch().await?;
        self.set_json(key, &v, ttl_secs).await?;
        Ok(v)
    }
}

#[derive(Debug, Error)]
pub enum CacheError {
    #[error("redis: {0}")]
    Redis(#[from] redis::RedisError),
    #[error("json: {0}")]
    Json(#[from] serde_json::Error),
    #[error("upstream: {0}")]
    Upstream(String),
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn cache_error_is_send_sync() {
        fn assert_send_sync<T: Send + Sync>() {}
        assert_send_sync::<CacheError>();
    }
}
