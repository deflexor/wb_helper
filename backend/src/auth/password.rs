use argon2::password_hash::{PasswordHash, PasswordHasher, PasswordVerifier, SaltString};
use argon2::Argon2;
use rand::rngs::OsRng;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum PasswordError {
    #[error("hashing failed: {0}")]
    Hash(argon2::password_hash::Error),
}

pub fn hash_password(plain: &str) -> Result<String, PasswordError> {
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();
    argon2
        .hash_password(plain.as_bytes(), &salt)
        .map(|h| h.to_string())
        .map_err(PasswordError::Hash)
}

pub fn verify_password(plain: &str, hash: &str) -> bool {
    let Ok(parsed) = PasswordHash::new(hash) else {
        return false;
    };
    Argon2::default()
        .verify_password(plain.as_bytes(), &parsed)
        .is_ok()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn verify_accepts_hashed_password() {
        let h = hash_password("correct-horse-battery").unwrap();
        assert!(verify_password("correct-horse-battery", &h));
        assert!(!verify_password("wrong", &h));
    }
}
