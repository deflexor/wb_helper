use std::collections::HashMap;
use std::hash::Hash;
use std::sync::{Arc, Mutex};

use super::{SystemClock, TokenBucket};

/// One [`TokenBucket`] per key (e.g. user id or API key id).
pub struct KeyedTokenBuckets<K: Eq + Hash + Clone + Send> {
    capacity: f64,
    refill_per_sec: f64,
    inner: Mutex<HashMap<K, Arc<TokenBucket<SystemClock>>>>,
}

impl<K: Eq + Hash + Clone + Send> KeyedTokenBuckets<K> {
    pub fn new(capacity: f64, refill_per_sec: f64) -> Self {
        Self {
            capacity,
            refill_per_sec,
            inner: Mutex::new(HashMap::new()),
        }
    }

    fn bucket_for(&self, key: &K) -> Arc<TokenBucket<SystemClock>> {
        let mut map = self.inner.lock().expect("keyed buckets poisoned");
        map.entry(key.clone())
            .or_insert_with(|| {
                Arc::new(TokenBucket::new(
                    SystemClock,
                    self.capacity,
                    self.refill_per_sec,
                ))
            })
            .clone()
    }

    pub fn try_acquire_one(&self, key: &K) -> bool {
        self.bucket_for(key).try_acquire_one()
    }

    pub async fn acquire_one(&self, key: K) {
        let bucket = self.bucket_for(&key);
        bucket.acquire_one().await;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn keys_are_independent() {
        let k = KeyedTokenBuckets::new(1.0, 0.0);
        assert!(k.try_acquire_one(&"a".to_string()));
        assert!(!k.try_acquire_one(&"a".to_string()));
        assert!(k.try_acquire_one(&"b".to_string()));
    }
}
