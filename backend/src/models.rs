//! Row types for `sqlx` mapping.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Copy, PartialEq, Eq, sqlx::Type, Serialize, Deserialize)]
#[sqlx(type_name = "subscription_tier", rename_all = "lowercase")]
#[serde(rename_all = "lowercase")]
pub enum SubscriptionTier {
    Free,
    Paid,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, sqlx::Type, Serialize)]
#[sqlx(type_name = "marketplace", rename_all = "lowercase")]
#[serde(rename_all = "lowercase")]
pub enum Marketplace {
    Wildberries,
    Ozon,
}

#[derive(Debug, Clone, FromRow)]
pub struct UserRow {
    pub id: Uuid,
    pub email: String,
    pub password_hash: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, FromRow)]
pub struct SubscriptionRow {
    pub user_id: Uuid,
    pub tier: SubscriptionTier,
    pub valid_until: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, FromRow)]
pub struct ApiKeyRow {
    pub id: Uuid,
    pub user_id: Uuid,
    pub name: String,
    pub key_prefix: String,
    pub key_hash: String,
    pub created_at: DateTime<Utc>,
    pub last_used_at: Option<DateTime<Utc>>,
}
