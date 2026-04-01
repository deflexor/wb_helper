//! JSON shapes for the Python `ai-service` HTTP API (`/v1/*`).
//!
//! Env (backend): `AI_SERVICE_URL` (e.g. `http://ai-service:8000`), optional `AI_SERVICE_INTERNAL_KEY`
//! sent as header `X-Internal-Key` on each request.

use serde::{Deserialize, Serialize};
use serde_json::Value;

pub const CHAT_COMPLETIONS_PATH: &str = "/v1/chat/completions";
pub const EMBEDDINGS_PATH: &str = "/v1/embeddings";
pub const VECTORS_UPSERT_PATH: &str = "/v1/vectors/upsert";
pub const VECTORS_SEARCH_PATH: &str = "/v1/vectors/search";
pub const NICHE_ANALYSIS_PATH: &str = "/v1/analysis/niche";

#[allow(dead_code)]
fn empty_object() -> Value {
    serde_json::json!({})
}

#[derive(Debug, Clone, Serialize)]
pub struct ChatCompletionRequest {
    pub subscription_tier: String,
    pub tool: String,
    pub messages: Vec<Value>,
    #[serde(default = "empty_object")]
    pub context: Value,
}

#[derive(Debug, Clone, Deserialize, PartialEq, Eq)]
pub struct ChatCompletionResponse {
    pub content: String,
    pub model_used: String,
    #[serde(default)]
    pub warnings: Vec<String>,
    #[serde(default)]
    pub events: Vec<Value>,
}

#[derive(Debug, Clone, Serialize)]
pub struct EmbeddingRequest {
    pub texts: Vec<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct EmbeddingResponse {
    pub vectors: Vec<Vec<f64>>,
    pub model: String,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn chat_completion_response_deserializes_minimal_json() {
        let j = r#"{"content":"ok","model_used":"m1"}"#;
        let r: ChatCompletionResponse = serde_json::from_str(j).unwrap();
        assert_eq!(r.content, "ok");
        assert_eq!(r.model_used, "m1");
        assert!(r.warnings.is_empty());
    }
}
