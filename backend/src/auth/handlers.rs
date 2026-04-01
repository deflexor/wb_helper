use std::sync::Arc;

use axum::extract::{Extension, State};
use axum::http::StatusCode;
use axum::Json;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use uuid::Uuid;

use crate::auth::middleware::AuthContext;
use crate::auth::password::{hash_password, verify_password};
use crate::models::{SubscriptionTier, UserRow};
use crate::state::AppState;

#[derive(Deserialize)]
pub struct RegisterBody {
    pub email: String,
    pub password: String,
}

#[derive(Serialize)]
pub struct AuthResponse {
    pub token: String,
    pub user_id: Uuid,
    pub tier: SubscriptionTier,
}

pub async fn register(
    State(state): State<Arc<AppState>>,
    Json(body): Json<RegisterBody>,
) -> Result<Json<AuthResponse>, (StatusCode, String)> {
    if body.password.len() < 8 {
        return Err((
            StatusCode::BAD_REQUEST,
            "password must be at least 8 characters".into(),
        ));
    }
    let hash = hash_password(&body.password).map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("password hash failed: {e}"),
        )
    })?;

    let mut tx = state.pool.begin().await.map_err(db_err)?;
    let user = sqlx::query_as::<_, UserRow>(
        "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, password_hash, created_at",
    )
    .bind(&body.email)
    .bind(&hash)
    .fetch_one(&mut *tx)
    .await
    .map_err(|e| match e {
        sqlx::Error::Database(ref d) if d.constraint() == Some("users_email_key") => {
            (StatusCode::CONFLICT, "email already registered".into())
        }
        _ => db_err(e),
    })?;

    sqlx::query(
        "INSERT INTO subscriptions (user_id, tier) VALUES ($1, 'free'::subscription_tier)",
    )
    .bind(user.id)
    .execute(&mut *tx)
    .await
    .map_err(db_err)?;

    tx.commit().await.map_err(db_err)?;

    let token = state
        .jwt
        .sign(user.id, SubscriptionTier::Free)
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("jwt: {e}"),
            )
        })?;

    Ok(Json(AuthResponse {
        token,
        user_id: user.id,
        tier: SubscriptionTier::Free,
    }))
}

#[derive(Deserialize)]
pub struct LoginBody {
    pub email: String,
    pub password: String,
}

pub async fn login(
    State(state): State<Arc<AppState>>,
    Json(body): Json<LoginBody>,
) -> Result<Json<AuthResponse>, (StatusCode, String)> {
    let user = sqlx::query_as::<_, UserRow>("SELECT id, email, password_hash, created_at FROM users WHERE email = $1")
        .bind(&body.email)
        .fetch_optional(&state.pool)
        .await
        .map_err(db_err)?
        .ok_or((StatusCode::UNAUTHORIZED, "invalid credentials".into()))?;

    if !verify_password(&body.password, &user.password_hash) {
        return Err((StatusCode::UNAUTHORIZED, "invalid credentials".into()));
    }

    let tier: SubscriptionTier =
        sqlx::query_scalar("SELECT tier FROM subscriptions WHERE user_id = $1")
            .bind(user.id)
            .fetch_one(&state.pool)
            .await
            .map_err(db_err)?;

    let token = state.jwt.sign(user.id, tier).map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("jwt: {e}"),
        )
    })?;

    Ok(Json(AuthResponse {
        token,
        user_id: user.id,
        tier,
    }))
}

#[derive(Serialize)]
pub struct MeResponse {
    pub user_id: Uuid,
    pub email: String,
    pub tier: SubscriptionTier,
}

pub async fn me(
    State(state): State<Arc<AppState>>,
    Extension(ctx): Extension<AuthContext>,
) -> Result<Json<MeResponse>, (StatusCode, String)> {
    let row: UserRow =
        sqlx::query_as("SELECT id, email, password_hash, created_at FROM users WHERE id = $1")
            .bind(ctx.user_id)
            .fetch_one(&state.pool)
            .await
            .map_err(db_err)?;
    Ok(Json(MeResponse {
        user_id: row.id,
        email: row.email,
        tier: ctx.tier,
    }))
}

#[derive(Deserialize)]
pub struct CreateKeyBody {
    pub name: String,
}

#[derive(Serialize)]
pub struct CreateKeyResponse {
    pub id: Uuid,
    pub name: String,
    pub key: String,
    pub key_prefix: String,
}

pub async fn create_api_key(
    State(state): State<Arc<AppState>>,
    Extension(ctx): Extension<AuthContext>,
    Json(body): Json<CreateKeyBody>,
) -> Result<Json<CreateKeyResponse>, (StatusCode, String)> {
    let paid = ctx.tier == SubscriptionTier::Paid;
    let max = state.max_api_keys_for_tier(paid);
    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM api_keys WHERE user_id = $1")
        .bind(ctx.user_id)
        .fetch_one(&state.pool)
        .await
        .map_err(db_err)?;
    if count >= max {
        return Err((
            StatusCode::FORBIDDEN,
            format!("API key limit reached for your plan ({max})"),
        ));
    }

    let raw_key = format!("wh_{}", Uuid::new_v4().simple());
    let key_hash = hex_hash(&raw_key);
    let key_prefix = raw_key.chars().take(10).collect::<String>();

    let id: Uuid = sqlx::query_scalar(
        "INSERT INTO api_keys (user_id, name, key_prefix, key_hash) VALUES ($1, $2, $3, $4) RETURNING id",
    )
    .bind(ctx.user_id)
    .bind(&body.name)
    .bind(&key_prefix)
    .bind(&key_hash)
    .fetch_one(&state.pool)
    .await
    .map_err(db_err)?;

    Ok(Json(CreateKeyResponse {
        id,
        name: body.name,
        key: raw_key,
        key_prefix,
    }))
}

fn hex_hash(s: &str) -> String {
    let d = Sha256::digest(s.as_bytes());
    d.iter().map(|b| format!("{b:02x}")).collect()
}

fn db_err(e: sqlx::Error) -> (StatusCode, String) {
    tracing::error!(?e, "database error");
    (
        StatusCode::INTERNAL_SERVER_ERROR,
        "database error".into(),
    )
}
