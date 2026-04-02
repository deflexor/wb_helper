//! Authenticated proxy to the Python AI service (`AI_SERVICE_URL`).

use std::sync::Arc;

use axum::extract::{Extension, State};
use axum::http::{HeaderMap, HeaderValue, StatusCode};
use axum::response::{IntoResponse, Response};
use axum::Json;
use chrono::Utc;
use metrics::counter;
use serde::Deserialize;
use serde_json::json;
use serde_json::Value;

use crate::ai_contract::{
    ChatCompletionRequest, ChatCompletionResponse, NicheAnalysisProxyRequest,
    NicheAnalysisProxyResponse, QuotaBackendUnavailablePayload, QuotaExceededPayload,
    CHAT_COMPLETIONS_PATH, NICHE_ANALYSIS_PATH,
};
use crate::auth::middleware::AuthContext;
use crate::models::SubscriptionTier;
use crate::state::AppState;
use crate::usage_quota;

#[derive(Deserialize)]
pub struct AiChatBody {
    pub tool: String,
    #[serde(default)]
    pub model: Option<String>,
    pub messages: Vec<Value>,
    #[serde(default)]
    pub context: Value,
}

#[derive(Deserialize)]
pub struct AiNicheBody {
    pub query: String,
    #[serde(default = "default_niche_limit")]
    pub limit: i32,
}

fn default_niche_limit() -> i32 {
    15
}

const MAX_TOOL_LENGTH: usize = 32;
const MAX_MODEL_HINT_LENGTH: usize = 128;
const MAX_CHAT_MESSAGES: usize = 100;
const MAX_CHAT_MESSAGE_CONTENT_CHARS: usize = 4_000;
const MAX_NICHE_QUERY_CHARS: usize = 300;
const MIN_NICHE_LIMIT: i32 = 1;
const MAX_NICHE_LIMIT: i32 = 50;

fn tier_str(tier: SubscriptionTier) -> &'static str {
    match tier {
        SubscriptionTier::Free => "free",
        SubscriptionTier::Paid => "paid",
    }
}

fn validate_tool(tool: &str) -> bool {
    matches!(
        tool,
        "seo" | "review" | "pricing" | "returns" | "default"
    )
}

fn ai_url(base: &str, path: &str) -> String {
    format!(
        "{}/{}",
        base.trim_end_matches('/'),
        path.trim_start_matches('/')
    )
}

fn bad_request(message: &str) -> Response {
    (StatusCode::BAD_REQUEST, Json(json!({ "error": message }))).into_response()
}

fn validate_chat_payload(body: &AiChatBody) -> Result<String, String> {
    let tool = body.tool.trim();
    if tool.is_empty() {
        return Err("tool is required".to_string());
    }
    if tool.len() > MAX_TOOL_LENGTH {
        return Err("tool must be at most 32 characters".to_string());
    }
    if !validate_tool(tool) {
        return Err("invalid tool; expected one of: seo, review, pricing, returns, default".to_string());
    }
    if body.messages.is_empty() {
        return Err("messages must contain at least one item".to_string());
    }
    if body.messages.len() > MAX_CHAT_MESSAGES {
        return Err("messages must contain at most 100 items".to_string());
    }
    for (idx, message) in body.messages.iter().enumerate() {
        let Some(content) = message.get("content") else {
            continue;
        };
        let Some(content) = content.as_str() else {
            return Err(format!("message[{idx}].content must be a string"));
        };
        if content.chars().count() > MAX_CHAT_MESSAGE_CONTENT_CHARS {
            return Err(format!(
                "message[{idx}].content must be at most 4000 characters"
            ));
        }
    }
    if let Some(model_hint) = body.model.as_deref() {
        let model_hint = model_hint.trim();
        if model_hint.is_empty() {
            return Err("model hint must not be empty when provided".to_string());
        }
        if model_hint.len() > MAX_MODEL_HINT_LENGTH {
            return Err("model hint must be at most 128 characters".to_string());
        }
    }
    Ok(tool.to_string())
}

fn validate_niche_payload(body: &AiNicheBody) -> Result<(String, i32), String> {
    let q = body.query.trim();
    if q.is_empty() {
        return Err("query is required".to_string());
    }
    if q.chars().count() > MAX_NICHE_QUERY_CHARS {
        return Err("query must be 1..=300 characters".to_string());
    }
    if !(MIN_NICHE_LIMIT..=MAX_NICHE_LIMIT).contains(&body.limit) {
        return Err("limit must be between 1 and 50".to_string());
    }
    Ok((q.to_string(), body.limit))
}

pub async fn proxy_chat(
    State(state): State<Arc<AppState>>,
    Extension(auth): Extension<AuthContext>,
    Json(body): Json<AiChatBody>,
) -> Result<Response, Response> {
    let tool = validate_chat_payload(&body).map_err(|msg| bad_request(msg.as_str()))?;
    let cfg = state
        .runtime_config()
        .await
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "runtime config unavailable").into_response())?;
    // Quota accounting is based on server-configured effective model,
    // not client hints, so clients cannot inflate free-model allowances.
    let model_id = cfg.ai_default_model_id.clone();

    let base = state
        .ai_service_url
        .as_deref()
        .filter(|s| !s.is_empty())
        .ok_or((
            StatusCode::SERVICE_UNAVAILABLE,
            "AI service is not configured".to_string(),
        )
            .into_response())?;
    let reservation = enforce_quota(&state, &auth, &model_id, &cfg).await?;

    let url = ai_url(base, CHAT_COMPLETIONS_PATH);

    let req_body = ChatCompletionRequest {
        subscription_tier: tier_str(auth.tier).to_string(),
        tool: tool.to_string(),
        messages: body.messages,
        context: body.context,
    };

    let mut headers = HeaderMap::new();
    headers.insert("Content-Type", HeaderValue::from_static("application/json"));
    if let Some(key) = state.ai_service_internal_key.as_deref() {
        if !key.is_empty() {
            if let Ok(h) = HeaderValue::from_str(key) {
                headers.insert("X-Internal-Key", h);
            }
        }
    }

    let res = state
        .http_client
        .post(url)
        .headers(headers)
        .json(&req_body)
        .send()
        .await
        .map_err(|e| {
            rollback_quota(&state, &reservation);
            (StatusCode::BAD_GATEWAY, e.to_string()).into_response()
        })?;

    if !res.status().is_success() {
        rollback_quota(&state, &reservation);
        let status = res.status();
        let text = res.text().await.unwrap_or_default();
        let code = StatusCode::from_u16(status.as_u16()).unwrap_or(StatusCode::BAD_GATEWAY);
        return Err((code, text).into_response());
    }

    let parsed: ChatCompletionResponse = res
        .json()
        .await
        .map_err(|e| {
            rollback_quota(&state, &reservation);
            (StatusCode::BAD_GATEWAY, e.to_string()).into_response()
        })?;

    let mut response = Json(parsed).into_response();
    apply_quota_headers(&mut response, &reservation);
    Ok(response)
}

pub async fn proxy_niche(
    State(state): State<Arc<AppState>>,
    Extension(auth): Extension<AuthContext>,
    Json(body): Json<AiNicheBody>,
) -> Result<Response, Response> {
    let (q, limit) = validate_niche_payload(&body).map_err(|msg| bad_request(msg.as_str()))?;
    let cfg = state
        .runtime_config()
        .await
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "runtime config unavailable").into_response())?;

    let base = state
        .ai_service_url
        .as_deref()
        .filter(|s| !s.is_empty())
        .ok_or((StatusCode::SERVICE_UNAVAILABLE, "AI service is not configured".to_string()).into_response())?;
    let reservation = enforce_quota(&state, &auth, cfg.ai_default_model_id.as_str(), &cfg).await?;

    let url = ai_url(base, NICHE_ANALYSIS_PATH);

    let req_body = NicheAnalysisProxyRequest {
        user_id: auth.user_id.to_string(),
        query: q,
        limit,
        subscription_tier: tier_str(auth.tier).to_string(),
    };

    let mut headers = HeaderMap::new();
    headers.insert("Content-Type", HeaderValue::from_static("application/json"));
    if let Some(key) = state.ai_service_internal_key.as_deref() {
        if !key.is_empty() {
            if let Ok(h) = HeaderValue::from_str(key) {
                headers.insert("X-Internal-Key", h);
            }
        }
    }

    let res = state
        .http_client
        .post(url)
        .headers(headers)
        .json(&req_body)
        .send()
        .await
        .map_err(|e| {
            rollback_quota(&state, &reservation);
            (StatusCode::BAD_GATEWAY, e.to_string()).into_response()
        })?;

    if !res.status().is_success() {
        rollback_quota(&state, &reservation);
        let status = res.status();
        let text = res.text().await.unwrap_or_default();
        let code = StatusCode::from_u16(status.as_u16()).unwrap_or(StatusCode::BAD_GATEWAY);
        return Err((code, text).into_response());
    }

    let parsed: NicheAnalysisProxyResponse = res
        .json()
        .await
        .map_err(|e| {
            rollback_quota(&state, &reservation);
            (StatusCode::BAD_GATEWAY, e.to_string()).into_response()
        })?;

    let mut response = Json(parsed).into_response();
    apply_quota_headers(&mut response, &reservation);
    Ok(response)
}

async fn enforce_quota(
    state: &Arc<AppState>,
    auth: &AuthContext,
    model_id: &str,
    cfg: &crate::config::RuntimeConfig,
) -> Result<Option<QuotaReservation>, Response> {
    let Some(limit) = usage_quota::resolve_limit(auth.tier, model_id, cfg) else {
        return Ok(None);
    };
    let window = usage_quota::utc_daily_window(auth.user_id, Utc::now());

    let decision = match state.redis.as_ref() {
        Some(redis) => {
            let mut conn = redis.clone();
            match usage_quota::try_consume_daily_usage(
                &mut conn,
                window.redis_key.as_str(),
                window.expires_at_epoch_utc,
                limit,
            )
            .await
            {
                Ok(decision) => decision,
                Err(err) => match handle_redis_outage(auth.tier, err.to_string()) {
                    Ok(_) => return Ok(None),
                    Err(response) => return Err(response),
                },
            }
        }
        None => match handle_redis_outage(auth.tier, "redis not configured".to_string()) {
            Ok(_) => return Ok(None),
            Err(response) => return Err(response),
        },
    };

    if !decision.allowed || decision.used > limit {
        let payload = QuotaExceededPayload {
            code: "daily_quota_exceeded".to_string(),
            message: "Daily AI quota exceeded for current plan".to_string(),
            used: decision.used,
            limit,
            resets_at_utc: window.resets_at_utc.to_rfc3339(),
            upgrade_url: "/upgrade".to_string(),
        };
        return Err((StatusCode::TOO_MANY_REQUESTS, Json(payload)).into_response());
    }

    Ok(Some(QuotaReservation {
        key: window.redis_key,
        used: decision.used,
        limit,
        should_rollback_on_failure: true,
    }))
}

fn handle_redis_outage(tier: SubscriptionTier, reason: String) -> Result<u32, Response> {
    match tier {
        SubscriptionTier::Free => {
            let payload = QuotaBackendUnavailablePayload {
                code: "quota_backend_unavailable".to_string(),
                message: "Quota backend is temporarily unavailable".to_string(),
            };
            Err((StatusCode::SERVICE_UNAVAILABLE, Json(payload)).into_response())
        }
        SubscriptionTier::Paid => {
            counter!("quota_paid_backend_unavailable_total").increment(1);
            tracing::warn!(
                error = %reason,
                quota_mode = "degraded_open",
                quota_event = "quota_paid_backend_unavailable",
                "redis unavailable during paid-tier quota check; allowing request without decrement"
            );
            Ok(0)
        }
    }
}

struct QuotaReservation {
    key: String,
    used: u32,
    limit: u32,
    should_rollback_on_failure: bool,
}

fn apply_quota_headers(response: &mut Response, reservation: &Option<QuotaReservation>) {
    let Some(reservation) = reservation else {
        return;
    };
    if let Ok(value) = HeaderValue::from_str(reservation.used.to_string().as_str()) {
        response.headers_mut().insert("x-quota-used", value);
    }
    if let Ok(value) = HeaderValue::from_str(reservation.limit.to_string().as_str()) {
        response.headers_mut().insert("x-quota-limit", value);
    }
}

fn rollback_quota(state: &Arc<AppState>, reservation: &Option<QuotaReservation>) {
    let Some(reservation) = reservation else {
        return;
    };
    if !reservation.should_rollback_on_failure {
        return;
    }
    let Some(redis) = state.redis.as_ref() else {
        return;
    };
    let mut conn = redis.clone();
    let key = reservation.key.clone();
    tokio::spawn(async move {
        if let Err(err) = usage_quota::rollback_daily_usage(&mut conn, key.as_str()).await {
            tracing::warn!(
                error = %err,
                quota_event = "quota_rollback_failed",
                "failed to rollback quota usage after upstream failure"
            );
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn validate_niche_payload_rejects_oversized_query() {
        let body = AiNicheBody {
            query: "x".repeat(301),
            limit: 5,
        };
        let err = validate_niche_payload(&body).expect_err("query must fail");
        assert_eq!(err, "query must be 1..=300 characters");
    }

    #[test]
    fn validate_chat_payload_rejects_non_string_content() {
        let body = AiChatBody {
            tool: "default".to_string(),
            model: None,
            messages: vec![json!({"role": "user", "content": 42})],
            context: json!({}),
        };
        let err = validate_chat_payload(&body).expect_err("content type must fail");
        assert_eq!(err, "message[0].content must be a string");
    }

    #[test]
    fn validate_chat_payload_rejects_oversized_content() {
        let body = AiChatBody {
            tool: "default".to_string(),
            model: None,
            messages: vec![json!({"role": "user", "content": "x".repeat(4_001)})],
            context: json!({}),
        };
        let err = validate_chat_payload(&body).expect_err("content length must fail");
        assert_eq!(err, "message[0].content must be at most 4000 characters");
    }
}
