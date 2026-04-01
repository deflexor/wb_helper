//! Marketplace sync: fetch via WB/Ozon clients, optional Redis cache, persist snapshots and prices.

mod handlers;
mod ozon_parse;
mod service;

pub use handlers::{list_credentials, run_sync, upsert_credential};
pub use service::{sync_user_marketplaces, SyncError, SyncSummary};
