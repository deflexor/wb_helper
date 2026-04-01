use thiserror::Error;
use uuid::Uuid;

use crate::cache::{CacheError, RedisJsonCache};
use crate::marketplace::{OzonClient, WbClient};
use crate::models::{Marketplace, MarketplaceCredentialRow};
use crate::state::AppState;
use crate::sync::ozon_parse::parse_ozon_list_response;

const CACHE_TTL_SECS: u64 = 300;

#[derive(Debug, Default, Clone, serde::Serialize)]
pub struct SyncSummary {
    pub snapshots_written: u32,
    pub prices_written: u32,
}

#[derive(Debug, Error)]
pub enum SyncError {
    #[error("database: {0}")]
    Db(#[from] sqlx::Error),
    #[error("wildberries: {0}")]
    Wb(#[from] crate::marketplace::WbError),
    #[error("ozon: {0}")]
    Ozon(#[from] crate::marketplace::OzonError),
    #[error("cache: {0}")]
    Cache(#[from] CacheError),
}

pub async fn sync_user_marketplaces(state: &AppState, user_id: Uuid) -> Result<SyncSummary, SyncError> {
    let rows: Vec<MarketplaceCredentialRow> = sqlx::query_as(
        r#"SELECT id, user_id, marketplace, label, wb_api_token, ozon_client_id, ozon_api_key, created_at, updated_at
           FROM marketplace_credentials WHERE user_id = $1
           ORDER BY marketplace, label"#,
    )
    .bind(user_id)
    .fetch_all(&state.pool)
    .await?;

    let wb = WbClient::new(state.http_client.clone(), state.wb_rates.clone())?;
    let ozon = OzonClient::new(state.http_client.clone(), state.ozon_rates.clone())?;

    let mut summary = SyncSummary::default();

    for row in rows {
        match row.marketplace {
            Marketplace::Wildberries => {
                let Some(ref token) = row.wb_api_token else { continue };
                if token.is_empty() {
                    continue;
                }
                let rate_key = format!("{user_id}:wb:{}", row.id);
                let cache_key = format!("mkt:wb:{user_id}:{}:seller_info", row.id);
                let json = if let Some(ref r) = state.redis {
                    let cache = RedisJsonCache::new(r.clone());
                    cache
                        .get_or_fetch_json(&cache_key, CACHE_TTL_SECS, || async {
                            wb.get_seller_info(&rate_key, token)
                                .await
                                .map_err(|e| CacheError::Upstream(e.to_string()))
                        })
                        .await?
                } else {
                    wb.get_seller_info(&rate_key, token).await?
                };
                insert_snapshot(&state.pool, user_id, Marketplace::Wildberries, "seller_info", &json)
                    .await?;
                summary.snapshots_written += 1;
            }
            Marketplace::Ozon => {
                let (Some(ref cid), Some(ref key)) = (&row.ozon_client_id, &row.ozon_api_key) else {
                    continue;
                };
                if cid.is_empty() || key.is_empty() {
                    continue;
                }
                let rate_key = format!("{user_id}:ozon:{}", row.id);
                let cache_key = format!("mkt:ozon:{user_id}:{}:product_list", row.id);
                let json = if let Some(ref r) = state.redis {
                    let cache = RedisJsonCache::new(r.clone());
                    cache
                        .get_or_fetch_json(&cache_key, CACHE_TTL_SECS, || async {
                            ozon.list_products_page(&rate_key, cid, key, 100)
                                .await
                                .map_err(|e| CacheError::Upstream(e.to_string()))
                        })
                        .await?
                } else {
                    ozon.list_products_page(&rate_key, cid, key, 100).await?
                };

                let digests = parse_ozon_list_response(&json);
                for d in digests {
                    insert_snapshot(
                        &state.pool,
                        user_id,
                        Marketplace::Ozon,
                        &d.external_id,
                        &d.item,
                    )
                    .await?;
                    summary.snapshots_written += 1;
                    if let Some(minor) = d.price_minor {
                        insert_pricing(
                            &state.pool,
                            user_id,
                            Marketplace::Ozon,
                            &d.external_id,
                            minor,
                            &d.currency,
                        )
                        .await?;
                        summary.prices_written += 1;
                    }
                }
            }
        }
    }

    Ok(summary)
}

async fn insert_snapshot(
    pool: &sqlx::PgPool,
    user_id: Uuid,
    marketplace: Marketplace,
    external_offer_id: &str,
    payload: &serde_json::Value,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"INSERT INTO product_snapshots (user_id, marketplace, external_offer_id, payload)
           VALUES ($1, $2::marketplace, $3, $4)"#,
    )
    .bind(user_id)
    .bind(marketplace)
    .bind(external_offer_id)
    .bind(payload)
    .execute(pool)
    .await?;
    Ok(())
}

async fn insert_pricing(
    pool: &sqlx::PgPool,
    user_id: Uuid,
    marketplace: Marketplace,
    external_offer_id: &str,
    price_minor: i64,
    currency: &str,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"INSERT INTO pricing_history (user_id, marketplace, external_offer_id, price_minor, currency)
           VALUES ($1, $2::marketplace, $3, $4, $5)"#,
    )
    .bind(user_id)
    .bind(marketplace)
    .bind(external_offer_id)
    .bind(price_minor)
    .bind(currency)
    .execute(pool)
    .await?;
    Ok(())
}
