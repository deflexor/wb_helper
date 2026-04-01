//! HTTP retry helpers: exponential backoff and status classification.

use std::time::Duration;

use rand::Rng;
use reqwest::StatusCode;
use tokio::time::sleep;

/// Whether a failed request should be retried and optional `Retry-After` hint.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum RetryDecision {
    /// Retry after this delay (or default backoff if `None`).
    Retry { after: Option<Duration> },
    NoRetry,
}

/// Wildberries / Ozon style overload responses.
pub fn classify_status(status: StatusCode) -> RetryDecision {
    if status == StatusCode::TOO_MANY_REQUESTS {
        return RetryDecision::Retry { after: None };
    }
    if status.is_server_error() {
        return RetryDecision::Retry { after: None };
    }
    RetryDecision::NoRetry
}

/// Parse `Retry-After` header: seconds or HTTP-date (seconds only implemented here).
pub fn retry_after_from_headers(headers: &reqwest::header::HeaderMap) -> Option<Duration> {
    let v = headers.get(reqwest::header::RETRY_AFTER)?.to_str().ok()?;
    let secs: u64 = v.parse().ok()?;
    Some(Duration::from_secs(secs))
}

/// Exponential backoff with full jitter: `min(cap_ms, random(0..=min(exp, cap_ms)))`.
pub fn backoff_delay(base: Duration, attempt: u32, cap: Duration) -> Duration {
    let exp_ms = base
        .as_millis()
        .saturating_mul(1u128 << attempt.min(16)) as u64;
    let cap_ms = cap.as_millis().max(1) as u64;
    let ceiling = exp_ms.min(cap_ms).max(1);
    let jitter = rand::thread_rng().gen_range(0..=ceiling);
    Duration::from_millis(jitter)
}

/// Run `op` until a non-retryable status or transport error; returns the final [`reqwest::Response`].
pub async fn execute_with_retry<F, Fut>(
    mut op: F,
    max_attempts: u32,
    base_backoff: Duration,
    cap_backoff: Duration,
) -> Result<reqwest::Response, reqwest::Error>
where
    F: FnMut() -> Fut,
    Fut: std::future::Future<Output = Result<reqwest::Response, reqwest::Error>>,
{
    let mut attempt = 0u32;
    loop {
        let response = op().await?;
        let decision = classify_status(response.status());
        match decision {
            RetryDecision::NoRetry => return Ok(response),
            RetryDecision::Retry { .. } if attempt + 1 >= max_attempts => return Ok(response),
            RetryDecision::Retry { .. } => {
                let wait = retry_after_from_headers(response.headers()).unwrap_or_else(|| {
                    backoff_delay(base_backoff, attempt, cap_backoff)
                });
                attempt += 1;
                drop(response);
                sleep(wait).await;
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn classifies_429_and_5xx_as_retry() {
        assert!(matches!(
            classify_status(StatusCode::TOO_MANY_REQUESTS),
            RetryDecision::Retry { .. }
        ));
        assert!(matches!(
            classify_status(StatusCode::BAD_GATEWAY),
            RetryDecision::Retry { .. }
        ));
        assert_eq!(classify_status(StatusCode::BAD_REQUEST), RetryDecision::NoRetry);
    }

    #[test]
    fn backoff_is_bounded() {
        let d = backoff_delay(Duration::from_millis(10), 10, Duration::from_millis(50));
        assert!(d <= Duration::from_millis(50));
    }
}
