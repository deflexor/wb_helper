-- | Auth.Middleware - Route protection middleware for subscription levels
module Auth.Middleware
    ( AuthError(..)
    , Middleware
    , requirePaid
    , requireFree
    , validateApiKey
    , withJWT
    ) where

import Data.Text (Text)
import Data.Time (UTCTime, getCurrentTime)
import qualified Data.Text as T

import Auth.JWT
import Database.Schema (UserId, Plan(..), User(..))

-- | Authentication error types
data AuthError
    = AuthMissing
    | AuthInvalid
    | AuthExpired
    | AuthUnauthorized
    | InvalidApiKeyFormat
    deriving (Show, Eq)

-- | Middleware type - simplifies route protection
-- In a real warpScotty app this would be a W.Middleware
type Middleware = forall a. (AuthResult -> AuthResult)

-- | Authentication result with user context
data AuthResult
    = AuthSuccess UserId Plan  -- User ID and subscription plan
    | AuthFailure AuthError     -- Authentication failed
    deriving (Show, Eq)

-- | Middleware to require paid subscription
requirePaid :: AuthResult -> AuthResult
requirePaid (AuthSuccess _ Paid) = AuthSuccess 0 Paid
requirePaid (AuthSuccess _ Free) = AuthFailure AuthUnauthorized
requirePaid result = result

-- | Middleware to require free subscription
requireFree :: AuthResult -> AuthResult
requireFree (AuthSuccess _ Free) = AuthSuccess 0 Free
requireFree (AuthSuccess _ _) = AuthFailure AuthUnauthorized
requireFree result = result

-- | Validate API key and return user context
validateApiKey :: Text -> IO (Either AuthError (UserId, Plan))
validateApiKey apiKey
    | T.length apiKey /= 64 = pure $ Left InvalidApiKeyFormat
    | not (T.all isHexChar apiKey) = pure $ Left InvalidApiKeyFormat
    | otherwise = do
        -- In real implementation, look up user by API key
        -- For now, return a placeholder
        pure $ Right (1, Paid)  -- Mock: user 1 with Paid plan

-- | Extract and validate JWT from Authorization header
withJWT :: Text -> Text -> IO AuthResult
withJWT secret authHeader =
    case T.splitOn " " authHeader of
        ["Bearer", token] -> do
            result <- validateJWT secret token
            case result of
                Right claims -> pure $ AuthSuccess (jscUserId claims) (jscSubscription claims)
                Left TokenExpired -> pure $ AuthFailure AuthExpired
                Left InvalidSignature -> pure $ AuthFailure AuthInvalid
                Left _ -> pure $ AuthFailure AuthInvalid
        _ -> pure $ AuthFailure AuthInvalid

-- | Check if character is hex
isHexChar :: Char -> Bool
isHexChar c = (c >= '0' && c <= '9') || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F')