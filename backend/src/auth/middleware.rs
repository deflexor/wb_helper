use std::sync::Arc;

use axum::body::Body;
use axum::extract::State;
use axum::http::{header::AUTHORIZATION, Request, StatusCode};
use axum::middleware::Next;
use axum::response::Response;
use sqlx::PgPool;
use uuid::Uuid;

use crate::models::{SubscriptionRow, SubscriptionTier};
use crate::state::AppState;

#[derive(Debug, Clone)]
pub struct AuthContext {
    pub user_id: Uuid,
    pub tier: SubscriptionTier,
}

/// Validates `Authorization: Bearer <jwt>` and loads current subscription tier from Postgres.
pub async fn jwt_auth_middleware(
    State(state): State<Arc<AppState>>,
    mut req: Request<Body>,
    next: Next,
) -> Result<Response, StatusCode> {
    let token = bearer_token(req.headers()).ok_or(StatusCode::UNAUTHORIZED)?;
    let claims = state.jwt.verify(token).map_err(|_| StatusCode::UNAUTHORIZED)?;
    let tier = load_subscription_tier(&state.pool, claims.sub)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    let tier = tier.unwrap_or(claims.tier);
    req.extensions_mut().insert(AuthContext {
        user_id: claims.sub,
        tier,
    });
    Ok(next.run(req).await)
}

fn bearer_token(headers: &axum::http::HeaderMap) -> Option<&str> {
    let val = headers.get(AUTHORIZATION)?.to_str().ok()?;
    val.strip_prefix("Bearer ")
}

async fn load_subscription_tier(
    pool: &PgPool,
    user_id: Uuid,
) -> Result<Option<SubscriptionTier>, sqlx::Error> {
    let row = sqlx::query_as::<_, SubscriptionRow>(
        "SELECT user_id, tier, valid_until FROM subscriptions WHERE user_id = $1",
    )
    .bind(user_id)
    .fetch_optional(pool)
    .await?;
    Ok(row.map(|r| r.tier))
}

#[cfg(test)]
mod tests {
    use axum::http::header::AUTHORIZATION;
    use axum::http::HeaderMap;

    use super::bearer_token;

    #[test]
    fn parses_bearer() {
        let mut h = HeaderMap::new();
        h.insert(
            AUTHORIZATION,
            axum::http::HeaderValue::from_static("Bearer abc.def.ghi"),
        );
        assert_eq!(bearer_token(&h), Some("abc.def.ghi"));
    }
}
