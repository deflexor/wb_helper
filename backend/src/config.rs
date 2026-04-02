use std::collections::HashMap;

use serde_json::Value;
use sqlx::{PgPool, Row};

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RuntimeConfig {
    pub free_daily_quota_base: u32,
    pub free_daily_quota_free_model_bonus: u32,
    pub free_openrouter_model_allowlist: Vec<String>,
    pub ai_provider: String,
    pub ai_default_model_id: String,
    pub paid_daily_quota: Option<u32>,
}

fn validate_config_key(key: &str) -> Result<(), sqlx::Error> {
    if key.is_empty() {
        return Err(sqlx::Error::Protocol("config key must not be empty".to_string()));
    }
    if key.len() > 64 {
        return Err(sqlx::Error::Protocol(format!(
            "config key too long (max 64 chars): {key}"
        )));
    }
    if !key
        .bytes()
        .all(|b| b.is_ascii_lowercase() || b.is_ascii_digit() || b == b'_')
    {
        return Err(sqlx::Error::Protocol(format!(
            "config key contains invalid characters: {key}"
        )));
    }
    Ok(())
}

fn parse_u32(config: &HashMap<String, Value>, key: &str) -> Result<u32, sqlx::Error> {
    let value = config
        .get(key)
        .ok_or_else(|| sqlx::Error::Protocol(format!("missing config key: {key}")))?;
    let number = value
        .as_u64()
        .ok_or_else(|| sqlx::Error::Protocol(format!("config key must be unsigned integer: {key}")))?;
    u32::try_from(number)
        .map_err(|_| sqlx::Error::Protocol(format!("config key value out of range for u32: {key}")))
}

fn parse_string(config: &HashMap<String, Value>, key: &str) -> Result<String, sqlx::Error> {
    let value = config
        .get(key)
        .ok_or_else(|| sqlx::Error::Protocol(format!("missing config key: {key}")))?;
    value
        .as_str()
        .map(str::to_owned)
        .ok_or_else(|| sqlx::Error::Protocol(format!("config key must be string: {key}")))
}

fn parse_non_empty_string(
    config: &HashMap<String, Value>,
    key: &str,
    max_len: usize,
) -> Result<String, sqlx::Error> {
    let value = parse_string(config, key)?;
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return Err(sqlx::Error::Protocol(format!(
            "config key must not be empty: {key}"
        )));
    }
    if trimmed.len() > max_len {
        return Err(sqlx::Error::Protocol(format!(
            "config key too long (max {max_len} chars): {key}"
        )));
    }
    Ok(trimmed.to_string())
}

fn parse_runtime_config_map(config: &HashMap<String, Value>) -> Result<RuntimeConfig, sqlx::Error> {
    let allowlist = config
        .get("free_openrouter_model_allowlist")
        .ok_or_else(|| sqlx::Error::Protocol("missing config key: free_openrouter_model_allowlist".to_string()))?
        .as_array()
        .ok_or_else(|| {
            sqlx::Error::Protocol(
                "config key must be string array: free_openrouter_model_allowlist".to_string(),
            )
        })?
        .iter()
        .map(|value| {
            value.as_str().map(str::to_owned).ok_or_else(|| {
                sqlx::Error::Protocol(
                    "config array element must be string: free_openrouter_model_allowlist".to_string(),
                )
            })
        })
        .collect::<Result<Vec<_>, _>>()?;

    let paid_daily_quota = match config.get("paid_daily_quota") {
        Some(Value::Null) => None,
        Some(value) => {
            let number = value.as_u64().ok_or_else(|| {
                sqlx::Error::Protocol("config key must be unsigned integer or null: paid_daily_quota".to_string())
            })?;
            Some(
                u32::try_from(number)
                    .map_err(|_| sqlx::Error::Protocol("config key value out of range for u32: paid_daily_quota".to_string()))?,
            )
        }
        None => return Err(sqlx::Error::Protocol("missing config key: paid_daily_quota".to_string())),
    };

    Ok(RuntimeConfig {
        free_daily_quota_base: parse_u32(config, "free_daily_quota_base")?,
        free_daily_quota_free_model_bonus: parse_u32(config, "free_daily_quota_free_model_bonus")?,
        free_openrouter_model_allowlist: allowlist,
        ai_provider: parse_non_empty_string(config, "ai_provider", 64)?,
        ai_default_model_id: parse_non_empty_string(config, "ai_default_model_id", 128)?,
        paid_daily_quota,
    })
}

pub fn parse_runtime_config_values(config: &HashMap<String, Value>) -> Result<RuntimeConfig, sqlx::Error> {
    parse_runtime_config_map(config)
}

pub async fn load_runtime_config(pool: &PgPool) -> Result<RuntimeConfig, sqlx::Error> {
    let rows = sqlx::query_as::<_, crate::models::AppConfigRow>(
        "SELECT key, value_json, updated_at FROM app_config WHERE key = ANY($1)",
    )
    .bind(vec![
        "free_daily_quota_base",
        "free_daily_quota_free_model_bonus",
        "free_openrouter_model_allowlist",
        "ai_provider",
        "ai_default_model_id",
        "paid_daily_quota",
    ])
    .fetch_all(pool)
    .await?;

    let mut config = HashMap::with_capacity(rows.len());
    for row in rows {
        config.insert(row.key, row.value_json);
    }
    parse_runtime_config_map(&config)
}

pub async fn list_config(pool: &PgPool) -> Result<Vec<crate::models::AppConfigRow>, sqlx::Error> {
    sqlx::query_as::<_, crate::models::AppConfigRow>(
        "SELECT key, value_json, updated_at FROM app_config ORDER BY key",
    )
    .fetch_all(pool)
    .await
}

pub async fn get_config_value(pool: &PgPool, key: &str) -> Result<Value, sqlx::Error> {
    validate_config_key(key)?;
    let row = sqlx::query("SELECT value_json FROM app_config WHERE key = $1")
        .bind(key)
        .fetch_optional(pool)
        .await?;
    let row = row.ok_or_else(|| sqlx::Error::Protocol(format!("unknown config key: {key}")))?;
    row.try_get("value_json")
}

pub fn parse_cli_value(raw: &str) -> Value {
    serde_json::from_str(raw).unwrap_or_else(|_| Value::String(raw.to_string()))
}

pub async fn apply_config_updates(
    pool: &PgPool,
    updates: Vec<(String, Value)>,
    actor: &str,
) -> Result<(), sqlx::Error> {
    if updates.is_empty() {
        return Err(sqlx::Error::Protocol("no updates provided".to_string()));
    }

    let keys: Vec<String> = updates.iter().map(|(key, _)| key.clone()).collect();
    for key in &keys {
        validate_config_key(key)?;
    }
    let mut tx = pool.begin().await?;

    let current_rows = sqlx::query(
        "SELECT key, value_json
         FROM app_config
         WHERE key = ANY($1)
         FOR UPDATE",
    )
    .bind(&keys)
    .fetch_all(&mut *tx)
    .await?;

    if current_rows.len() != keys.len() {
        for key in &keys {
            if !current_rows.iter().any(|row| row.try_get::<String, _>("key").ok().as_deref() == Some(key.as_str())) {
                return Err(sqlx::Error::Protocol(format!("unknown config key: {key}")));
            }
        }
    }

    let mut runtime_map = HashMap::new();
    for row in sqlx::query_as::<_, crate::models::AppConfigRow>(
        "SELECT key, value_json, updated_at FROM app_config WHERE key = ANY($1)",
    )
    .bind(vec![
        "free_daily_quota_base",
        "free_daily_quota_free_model_bonus",
        "free_openrouter_model_allowlist",
        "ai_provider",
        "ai_default_model_id",
        "paid_daily_quota",
    ])
    .fetch_all(&mut *tx)
    .await?
    {
        runtime_map.insert(row.key, row.value_json);
    }

    for (key, value) in &updates {
        runtime_map.insert(key.clone(), value.clone());
    }
    parse_runtime_config_map(&runtime_map)?;

    for (key, new_value) in updates {
        let old_row = current_rows
            .iter()
            .find(|row| row.try_get::<String, _>("key").ok().as_deref() == Some(key.as_str()))
            .ok_or_else(|| sqlx::Error::Protocol(format!("unknown config key: {key}")))?;
        let old_value: Value = old_row.try_get("value_json")?;

        sqlx::query(
            "UPDATE app_config
             SET value_json = $1, updated_at = now()
             WHERE key = $2",
        )
        .bind(&new_value)
        .bind(&key)
        .execute(&mut *tx)
        .await?;

        sqlx::query(
            "INSERT INTO app_config_audit (key, old_value, new_value, actor, changed_at)
             VALUES ($1, $2, $3, $4, now())",
        )
        .bind(&key)
        .bind(&old_value)
        .bind(&new_value)
        .bind(actor)
        .execute(&mut *tx)
        .await?;
    }

    tx.commit().await
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn valid_map() -> HashMap<String, Value> {
        let mut map = HashMap::new();
        map.insert("free_daily_quota_base".to_string(), json!(25));
        map.insert("free_daily_quota_free_model_bonus".to_string(), json!(15));
        map.insert(
            "free_openrouter_model_allowlist".to_string(),
            json!(["openai/gpt-4o-mini"]),
        );
        map.insert("ai_provider".to_string(), json!("openrouter"));
        map.insert("ai_default_model_id".to_string(), json!("openai/gpt-4o-mini"));
        map.insert("paid_daily_quota".to_string(), Value::Null);
        map
    }

    #[test]
    fn parse_runtime_config_ok() {
        let cfg = parse_runtime_config_map(&valid_map()).expect("valid config parses");
        assert_eq!(cfg.free_daily_quota_base, 25);
        assert_eq!(cfg.paid_daily_quota, None);
    }

    #[test]
    fn parse_runtime_config_missing_key_fails() {
        let mut map = valid_map();
        map.remove("ai_provider");
        let err = parse_runtime_config_map(&map).expect_err("missing key must fail");
        assert!(err.to_string().contains("missing config key: ai_provider"));
    }

    #[test]
    fn parse_runtime_config_invalid_type_fails() {
        let mut map = valid_map();
        map.insert("free_daily_quota_base".to_string(), json!("twenty"));
        let err = parse_runtime_config_map(&map).expect_err("invalid type must fail");
        assert!(err
            .to_string()
            .contains("config key must be unsigned integer: free_daily_quota_base"));
    }

    #[test]
    fn parse_runtime_config_out_of_bounds_fails() {
        let mut map = valid_map();
        map.insert("paid_daily_quota".to_string(), json!(u64::from(u32::MAX) + 1));
        let err = parse_runtime_config_map(&map).expect_err("out-of-bounds must fail");
        assert!(err
            .to_string()
            .contains("config key value out of range for u32: paid_daily_quota"));
    }
}
