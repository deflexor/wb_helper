//! Marketplace HTTP clients (Wildberries, Ozon) with rate limiting and retries.

mod ozon;
mod wb;

pub use ozon::{OzonClient, OzonError};
pub use wb::{WbClient, WbError};

/// Conservative defaults; tune from env or config using official limit tables.
#[derive(Debug, Clone)]
pub struct MarketplaceRateConfig {
    pub bucket_capacity: f64,
    pub bucket_refill_per_sec: f64,
}

impl Default for MarketplaceRateConfig {
    fn default() -> Self {
        Self {
            bucket_capacity: 5.0,
            bucket_refill_per_sec: 1.0,
        }
    }
}
