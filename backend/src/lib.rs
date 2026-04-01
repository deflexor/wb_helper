//! HTTP API application (Axum).

use axum::{routing::get, Json, Router};
use serde::Serialize;

#[derive(Serialize)]
struct HelloResponse {
    message: &'static str,
}

async fn api_hello() -> Json<HelloResponse> {
    Json(HelloResponse {
        message: "Welcome to WB Helper API",
    })
}

/// Builds the Axum router for integration tests and production.
pub fn create_app() -> Router {
    Router::new().route("/api/hello", get(api_hello))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn create_app_exposes_router() {
        let app = create_app();
        let _ = app;
    }
}

#[cfg(test)]
mod sqlx_link_smoke {
    /// Ensures the `sqlx` Postgres feature stays linked for upcoming persistence work.
    #[test]
    fn postgres_pool_type_exists() {
        use std::mem::size_of;
        let _ = size_of::<sqlx::postgres::PgPoolOptions>();
    }
}
