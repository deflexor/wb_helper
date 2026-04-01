//! Token bucket: configurable burst (`capacity`) and steady rate (`refill_per_sec`).

use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

/// Source of time for refill calculations (real clock or test double).
pub trait Clock: Send + Sync {
    fn now(&self) -> Instant;
}

/// Production wall-clock.
#[derive(Clone, Copy, Debug, Default)]
pub struct SystemClock;

impl Clock for SystemClock {
    fn now(&self) -> Instant {
        Instant::now()
    }
}

/// Manual clock for deterministic unit tests.
#[derive(Clone, Debug)]
pub struct ManualClock {
    now: Arc<Mutex<Instant>>,
}

impl ManualClock {
    pub fn new() -> Self {
        Self {
            now: Arc::new(Mutex::new(Instant::now())),
        }
    }

    pub fn advance(&self, d: Duration) {
        let mut g = self.now.lock().expect("manual clock poisoned");
        *g += d;
    }
}

impl Clock for ManualClock {
    fn now(&self) -> Instant {
        *self.now.lock().expect("manual clock poisoned")
    }
}

struct BucketState {
    tokens: f64,
    last: Instant,
}

/// Async token bucket. After the initial burst, tokens refill at `refill_per_sec`.
pub struct TokenBucket<C: Clock = SystemClock> {
    clock: C,
    capacity: f64,
    refill_per_sec: f64,
    inner: Mutex<BucketState>,
}

impl<C: Clock> TokenBucket<C> {
    pub fn new(clock: C, capacity: f64, refill_per_sec: f64) -> Self {
        assert!(capacity > 0.0, "capacity must be positive");
        assert!(refill_per_sec >= 0.0, "refill_per_sec cannot be negative");
        let now = clock.now();
        Self {
            clock,
            capacity,
            refill_per_sec,
            inner: Mutex::new(BucketState {
                tokens: capacity,
                last: now,
            }),
        }
    }

    fn refill(state: &mut BucketState, capacity: f64, refill_per_sec: f64, now: Instant) {
        let elapsed = now.saturating_duration_since(state.last).as_secs_f64();
        if elapsed <= 0.0 {
            return;
        }
        state.tokens = if refill_per_sec > 0.0 {
            (state.tokens + elapsed * refill_per_sec).min(capacity)
        } else {
            state.tokens
        };
        state.last = now;
    }

    /// Take one token if available; does not block.
    pub fn try_acquire_one(&self) -> bool {
        let now = self.clock.now();
        let mut state = self.inner.lock().expect("token bucket poisoned");
        Self::refill(&mut state, self.capacity, self.refill_per_sec, now);
        if state.tokens >= 1.0 {
            state.tokens -= 1.0;
            true
        } else {
            false
        }
    }

    /// Wait until one token can be taken. Requires `refill_per_sec > 0` after burst is consumed.
    pub async fn acquire_one(&self) {
        loop {
            let wait = {
                let now = self.clock.now();
                let mut state = self.inner.lock().expect("token bucket poisoned");
                Self::refill(&mut state, self.capacity, self.refill_per_sec, now);
                if state.tokens >= 1.0 {
                    state.tokens -= 1.0;
                    return;
                }
                if self.refill_per_sec > 0.0 {
                    let needed = 1.0 - state.tokens;
                    Duration::from_secs_f64(needed / self.refill_per_sec)
                } else {
                    Duration::from_millis(50)
                }
            };
            tokio::time::sleep(wait).await;
        }
    }
}

#[cfg(test)]
mod tests {
    use std::sync::Arc;

    use super::*;

    #[test]
    fn burst_respects_capacity_without_refill() {
        let clock = ManualClock::new();
        let b = TokenBucket::new(clock, 2.0, 0.0);
        assert!(b.try_acquire_one());
        assert!(b.try_acquire_one());
        assert!(!b.try_acquire_one());
    }

    #[test]
    fn refill_allows_new_token_after_time_passes() {
        let clock = ManualClock::new();
        let b = TokenBucket::new(clock.clone(), 1.0, 10.0);
        assert!(b.try_acquire_one());
        assert!(!b.try_acquire_one());
        clock.advance(Duration::from_millis(150));
        assert!(b.try_acquire_one());
    }

    #[tokio::test]
    async fn acquire_one_eventually_succeeds_after_refill() {
        let b = Arc::new(TokenBucket::new(SystemClock, 1.0, 100.0));
        b.acquire_one().await;
        // Second token arrives after ~10ms at 100/s; bounded wait for CI.
        tokio::time::timeout(Duration::from_secs(2), b.acquire_one())
            .await
            .expect("timeout");
    }
}
