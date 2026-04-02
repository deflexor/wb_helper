//! Authenticated proxy to the Python AI service (`AI_SERVICE_URL`).

use std::sync::Arc;

use axum::extract::{Extension, State};
use axum::http::{HeaderMap, HeaderValue, StatusCode};
use axum::Json;
use serde::Deserialize;
use serde_json::Value;

use crate::ai_contract::{
    ChatCompletionRequest, ChatCompletionResponse, NicheAnalysisProxyRequest,
    NicheAnalysisProxyResponse, CHAT_COMPLETIONS_PATH, NICHE_ANALYSIS_PATH,
};
use crate::auth::middleware::AuthContext;
use crate::models::SubscriptionTier;
use crate::state::AppState;

#[derive(Deserialize)]
pub struct AiChatBody {
    pub tool: String,
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

pub async fn proxy_chat(
    State(state): State<Arc<AppState>>,
    Extension(auth): Extension<AuthContext>,
    Json(body): Json<AiChatBody>,
) -> Result<Json<ChatCompletionResponse>, (StatusCode, String)> {
    if !validate_tool(&body.tool) {
        return Err((StatusCode::BAD_REQUEST, "invalid tool".into()));
    }

    let base = state
        .ai_service_url
        .as_deref()
        .filter(|s| !s.is_empty())
        .ok_or((
            StatusCode::SERVICE_UNAVAILABLE,
            "AI service is not configured".into(),
        ))?;

    let url = ai_url(base, CHAT_COMPLETIONS_PATH);

    let req_body = ChatCompletionRequest {
        subscription_tier: tier_str(auth.tier).to_string(),
        tool: body.tool,
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
        .map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;

    if !res.status().is_success() {
        let status = res.status();
        let text = res.text().await.unwrap_or_default();
        let code = StatusCode::from_u16(status.as_u16()).unwrap_or(StatusCode::BAD_GATEWAY);
        return Err((code, text));
    }

    let parsed: ChatCompletionResponse = res
        .json()
        .await
        .map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;

    Ok(Json(parsed))
}

pub async fn proxy_niche(
    State(state): State<Arc<AppState>>,
    Extension(auth): Extension<AuthContext>,
    Json(body): Json<AiNicheBody>,
) -> Result<Json<NicheAnalysisProxyResponse>, (StatusCode, String)> {
    let q = body.query.trim();
    if q.is_empty() {
        return Err((StatusCode::BAD_REQUEST, "query required".into()));
    }
    let limit = body.limit.clamp(1, 50);

    let base = state
        .ai_service_url
        .as_deref()
        .filter(|s| !s.is_empty())
        .ok_or((
            StatusCode::SERVICE_UNAVAILABLE,
            "AI service is not configured".into(),
        ))?;

    let url = ai_url(base, NICHE_ANALYSIS_PATH);

    let req_body = NicheAnalysisProxyRequest {
        user_id: auth.user_id.to_string(),
        query: q.to_string(),
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
        .map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;

    if !res.status().is_success() {
        let status = res.status();
        let text = res.text().await.unwrap_or_default();
        let code = StatusCode::from_u16(status.as_u16()).unwrap_or(StatusCode::BAD_GATEWAY);
        return Err((code, text));
    }

    let parsed: NicheAnalysisProxyResponse = res
        .json()
        .await
        .map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;

    Ok(Json(parsed))
}
