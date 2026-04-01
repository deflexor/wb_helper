use std::time::{Duration, SystemTime, UNIX_EPOCH};

use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use thiserror::Error;
use uuid::Uuid;

#[derive(Clone)]
pub struct JwtConfig {
    encoding: EncodingKey,
    decoding: DecodingKey,
    ttl: Duration,
}

impl JwtConfig {
    pub fn from_secret(secret: &[u8], ttl: Duration) -> Result<Self, JwtError> {
        if secret.len() < 32 {
            return Err(JwtError::WeakSecret);
        }
        Ok(Self {
            encoding: EncodingKey::from_secret(secret),
            decoding: DecodingKey::from_secret(secret),
            ttl,
        })
    }

    pub fn sign(&self, user_id: Uuid, tier: crate::models::SubscriptionTier) -> Result<String, JwtError> {
        let exp = SystemTime::now()
            .checked_add(self.ttl)
            .ok_or(JwtError::Time)?
            .duration_since(UNIX_EPOCH)
            .map_err(|_| JwtError::Time)?
            .as_secs() as usize;

        let claims = Claims {
            sub: user_id,
            tier,
            exp,
        };
        encode(&Header::default(), &claims, &self.encoding).map_err(JwtError::from)
    }

    pub fn verify(&self, token: &str) -> Result<Claims, JwtError> {
        let data = decode::<Claims>(token, &self.decoding, &Validation::default())
            .map_err(JwtError::from)?;
        Ok(data.claims)
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: Uuid,
    pub tier: crate::models::SubscriptionTier,
    pub exp: usize,
}

#[derive(Debug, Error)]
pub enum JwtError {
    #[error("JWT secret must be at least 32 bytes")]
    WeakSecret,
    #[error("time error")]
    Time,
    #[error("jwt: {0}")]
    Token(#[from] jsonwebtoken::errors::Error),
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sign_verify_roundtrip() {
        let cfg = JwtConfig::from_secret(b"0123456789abcdef0123456789abcdef", Duration::from_secs(3600))
            .unwrap();
        let uid = Uuid::nil();
        let tok = cfg.sign(uid, crate::models::SubscriptionTier::Free).unwrap();
        let c = cfg.verify(&tok).unwrap();
        assert_eq!(c.sub, uid);
    }
}
