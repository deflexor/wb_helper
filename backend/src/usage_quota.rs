use chrono::{DateTime, Datelike, Duration, TimeZone, Utc};
use redis::aio::ConnectionManager;
use uuid::Uuid;

use crate::config::RuntimeConfig;
use crate::models::SubscriptionTier;

pub struct QuotaWindow {
    pub redis_key: String,
    pub expires_at_epoch_utc: i64,
    pub resets_at_utc: DateTime<Utc>,
}

pub fn resolve_limit(tier: SubscriptionTier, model: &str, cfg: &RuntimeConfig) -> Option<u32> {
    match tier {
        SubscriptionTier::Paid => cfg.paid_daily_quota,
        SubscriptionTier::Free => {
            let bonus = if cfg.ai_provider == "openrouter"
                && cfg
                    .free_openrouter_model_allowlist
                    .iter()
                    .any(|allowed| allowed == model)
            {
                cfg.free_daily_quota_free_model_bonus
            } else {
                0
            };
            Some(cfg.free_daily_quota_base.saturating_add(bonus))
        }
    }
}

pub fn utc_daily_window(user_id: Uuid, now_utc: DateTime<Utc>) -> QuotaWindow {
    let day_key = format!(
        "{:04}-{:02}-{:02}",
        now_utc.year(),
        now_utc.month(),
        now_utc.day()
    );
    let midnight_today = Utc
        .with_ymd_and_hms(now_utc.year(), now_utc.month(), now_utc.day(), 0, 0, 0)
        .single()
        .expect("valid utc midnight");
    let resets_at_utc = midnight_today + Duration::days(1);
    QuotaWindow {
        redis_key: format!("usage:ai:{user_id}:{day_key}"),
        expires_at_epoch_utc: resets_at_utc.timestamp(),
        resets_at_utc,
    }
}

pub struct QuotaConsumeDecision {
    pub allowed: bool,
    pub used: u32,
}

pub async fn try_consume_daily_usage(
    conn: &mut ConnectionManager,
    redis_key: &str,
    expires_at_epoch_utc: i64,
    limit: u32,
) -> Result<QuotaConsumeDecision, redis::RedisError> {
    let script = redis::Script::new(
        r#"
local current = tonumber(redis.call('GET', KEYS[1]) or '0')
local limit = tonumber(ARGV[2])
if current >= limit then
  return {0, current}
end
current = redis.call('INCR', KEYS[1])
if current == 1 then
  redis.call('EXPIREAT', KEYS[1], ARGV[1])
end
return {1, current}
"#,
    );
    let (allowed, used): (i64, i64) = script
        .key(redis_key)
        .arg(expires_at_epoch_utc)
        .arg(limit)
        .invoke_async(conn)
        .await?;
    Ok(QuotaConsumeDecision {
        allowed: allowed == 1,
        used: u32::try_from(used).unwrap_or(u32::MAX),
    })
}

pub async fn rollback_daily_usage(
    conn: &mut ConnectionManager,
    redis_key: &str,
) -> Result<(), redis::RedisError> {
    let script = redis::Script::new(
        r#"
local current = tonumber(redis.call('GET', KEYS[1]) or '0')
if current <= 0 then
  return 0
end
local next = redis.call('DECR', KEYS[1])
if next <= 0 then
  redis.call('DEL', KEYS[1])
end
return next
"#,
    );
    let _: i64 = script.key(redis_key).invoke_async(conn).await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_cfg() -> RuntimeConfig {
        RuntimeConfig {
            free_daily_quota_base: 10,
            free_daily_quota_free_model_bonus: 5,
            free_openrouter_model_allowlist: vec!["openai/gpt-4o-mini".to_string()],
            ai_provider: "openrouter".to_string(),
            ai_default_model_id: "openai/gpt-4o-mini".to_string(),
            paid_daily_quota: Some(500),
        }
    }

    #[test]
    fn resolve_limit_handles_tier_and_bonus_model() {
        let cfg = sample_cfg();
        assert_eq!(
            resolve_limit(SubscriptionTier::Free, "openai/gpt-4o-mini", &cfg),
            Some(15)
        );
        assert_eq!(
            resolve_limit(SubscriptionTier::Free, "anthropic/claude", &cfg),
            Some(10)
        );
        assert_eq!(
            resolve_limit(SubscriptionTier::Paid, "any-model", &cfg),
            Some(500)
        );

        let mut cfg_non_openrouter = cfg.clone();
        cfg_non_openrouter.ai_provider = "anthropic".to_string();
        assert_eq!(
            resolve_limit(
                SubscriptionTier::Free,
                "openai/gpt-4o-mini",
                &cfg_non_openrouter
            ),
            Some(10)
        );
    }
}
