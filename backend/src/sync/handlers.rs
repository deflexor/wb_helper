use std::sync::Arc;

use axum::extract::{Extension, State};
use axum::http::StatusCode;
use axum::Json;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::auth::middleware::AuthContext;
use crate::models::{Marketplace, MarketplaceCredentialRow};
use crate::state::AppState;

use super::{sync_user_marketplaces, SyncSummary};

fn default_label() -> String {
    "default".into()
}

#[derive(Debug, Deserialize)]
pub struct UpsertCredentialBody {
    pub marketplace: Marketplace,
    #[serde(default = "default_label")]
    pub label: String,
    pub wb_api_token: Option<String>,
    pub ozon_client_id: Option<String>,
    pub ozon_api_key: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct CredentialView {
    pub id: Uuid,
    pub marketplace: Marketplace,
    pub label: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub wb_api_token_tail: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ozon_client_id_tail: Option<String>,
    pub has_ozon_api_key: bool,
}

fn secret_tail(s: &Option<String>) -> Option<String> {
    s.as_ref().and_then(|t| {
        if t.is_empty() {
            return None;
        }
        let t = t.as_str();
        Some(if t.len() <= 4 {
            "****".into()
        } else {
            format!("****{}", &t[t.len() - 4..])
        })
    })
}

pub async fn upsert_credential(
    State(state): State<Arc<AppState>>,
    Extension(ctx): Extension<AuthContext>,
    Json(body): Json<UpsertCredentialBody>,
) -> Result<Json<CredentialView>, (StatusCode, String)> {
    match body.marketplace {
        Marketplace::Wildberries => {
            let Some(ref t) = body.wb_api_token else {
                return Err((
                    StatusCode::BAD_REQUEST,
                    "wb_api_token required for wildberries".into(),
                ));
            };
            if t.is_empty() {
                return Err((StatusCode::BAD_REQUEST, "wb_api_token must be non-empty".into()));
            }
        }
        Marketplace::Ozon => {
            let (Some(cid), Some(key)) = (&body.ozon_client_id, &body.ozon_api_key) else {
                return Err((
                    StatusCode::BAD_REQUEST,
                    "ozon_client_id and ozon_api_key required for ozon".into(),
                ));
            };
            if cid.is_empty() || key.is_empty() {
                return Err((
                    StatusCode::BAD_REQUEST,
                    "ozon credentials must be non-empty".into(),
                ));
            }
        }
    }

    let row = sqlx::query_as::<_, MarketplaceCredentialRow>(
        r#"INSERT INTO marketplace_credentials (user_id, marketplace, label, wb_api_token, ozon_client_id, ozon_api_key)
           VALUES ($1, $2::marketplace, $3, $4, $5, $6)
           ON CONFLICT (user_id, marketplace, label) DO UPDATE SET
             wb_api_token = COALESCE(EXCLUDED.wb_api_token, marketplace_credentials.wb_api_token),
             ozon_client_id = COALESCE(EXCLUDED.ozon_client_id, marketplace_credentials.ozon_client_id),
             ozon_api_key = COALESCE(EXCLUDED.ozon_api_key, marketplace_credentials.ozon_api_key),
             updated_at = now()
           RETURNING id, user_id, marketplace, label, wb_api_token, ozon_client_id, ozon_api_key, created_at, updated_at"#,
    )
    .bind(ctx.user_id)
    .bind(body.marketplace)
    .bind(&body.label)
    .bind(body.wb_api_token.as_ref())
    .bind(body.ozon_client_id.as_ref())
    .bind(body.ozon_api_key.as_ref())
    .fetch_one(&state.pool)
    .await
    .map_err(|e| {
        tracing::error!(?e, "upsert marketplace_credentials");
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            "database error".into(),
        )
    })?;

    Ok(Json(row_to_view(row)))
}

pub async fn list_credentials(
    State(state): State<Arc<AppState>>,
    Extension(ctx): Extension<AuthContext>,
) -> Result<Json<Vec<CredentialView>>, (StatusCode, String)> {
    let rows: Vec<MarketplaceCredentialRow> =
        sqlx::query_as::<_, MarketplaceCredentialRow>(
            r#"SELECT id, user_id, marketplace, label, wb_api_token, ozon_client_id, ozon_api_key, created_at, updated_at
               FROM marketplace_credentials WHERE user_id = $1 ORDER BY marketplace, label"#,
        )
        .bind(ctx.user_id)
        .fetch_all(&state.pool)
        .await
        .map_err(|e| {
            tracing::error!(?e, "list marketplace_credentials");
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                "database error".into(),
            )
        })?;

    Ok(Json(rows.into_iter().map(row_to_view).collect()))
}

fn row_to_view(row: MarketplaceCredentialRow) -> CredentialView {
    CredentialView {
        id: row.id,
        marketplace: row.marketplace,
        label: row.label,
        wb_api_token_tail: secret_tail(&row.wb_api_token),
        ozon_client_id_tail: secret_tail(&row.ozon_client_id),
        has_ozon_api_key: row
            .ozon_api_key
            .as_ref()
            .map(|s| !s.is_empty())
            .unwrap_or(false),
    }
}

pub async fn run_sync(
    State(state): State<Arc<AppState>>,
    Extension(ctx): Extension<AuthContext>,
) -> Result<Json<SyncSummary>, (StatusCode, String)> {
    sync_user_marketplaces(&state, ctx.user_id)
        .await
        .map_err(|e| {
            tracing::error!(?e, "sync_user_marketplaces");
            (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
        })
        .map(Json)
}
