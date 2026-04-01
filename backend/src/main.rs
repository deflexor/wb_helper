//! WB Helper API server entrypoint.

use std::sync::Arc;

use backend::{app_state_from_env, create_app};

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "backend=info,tower_http=info".into()),
        )
        .init();

    let state: Arc<_> = app_state_from_env()
        .await
        .unwrap_or_else(|e| panic!("failed to init app state: {e}"));

    let addr: std::net::SocketAddr = std::env::var("BIND_ADDR")
        .unwrap_or_else(|_| "0.0.0.0:8080".to_string())
        .parse()
        .expect("BIND_ADDR must be a valid SocketAddr");

    let listener = tokio::net::TcpListener::bind(addr)
        .await
        .unwrap_or_else(|e| panic!("failed to bind {addr}: {e}"));

    tracing::info!(%addr, "listening");

    axum::serve(listener, create_app(state))
        .await
        .expect("server terminated with error");
}
