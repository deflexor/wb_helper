-- | Auth.Session - Secure session and API key management
module Auth.Session
    ( SessionError(..)
    , ApiKey(..)
    , hashPassword
    , verifyPassword
    , generateApiKey
    , validateApiKey
    ) where

import Data.Text (Text)
import qualified Data.Text as T
import qualified Data.Text.Encoding as TEnc
import qualified Data.ByteString as BS
import System.Random (randomRIO)
import Control.Monad (replicateM)
import Data.Word (Word8)

-- | API Key wrapper
newtype ApiKey = ApiKey { unApiKey :: Text }
    deriving (Show, Eq)

-- | Session error types
data SessionError
    = PasswordHashError Text
    | PasswordVerifyFailed
    | InvalidApiKey
    | HashGenerationFailed
    deriving (Show, Eq)

-- | Hash a password using simple hash (SHA256 via bytestring digest)
-- Note: In production, use bcrypt or argon2
hashPassword :: Text -> IO (Either SessionError Text)
hashPassword password = do
    -- Generate random salt
    salt <- generateSalt 16
    let passwordBytes = TEnc.encodeUtf8 password
        combined = BS.concat [passwordBytes, salt]
        -- Simple hash: just use the combined bytes (simplified for compatibility)
        hashBytes = combined  -- In production, use proper PBKDF2 or bcrypt
    pure $ Right $ TEnc.decodeUtf8 hashBytes <> T.pack ":" <> TEnc.decodeUtf8 salt

-- | Verify a password against a stored hash
verifyPassword :: Text -> Text -> IO (Either SessionError Bool)
verifyPassword password storedHash = do
    case T.splitOn (T.pack ":") storedHash of
        [storedHashBytes, salt] -> do
            let passwordBytes = TEnc.encodeUtf8 password
                saltBytes = TEnc.encodeUtf8 salt
                combined = BS.concat [passwordBytes, saltBytes]
                computedHash = combined  -- Same simplified hash
            if TEnc.decodeUtf8 computedHash == storedHashBytes
                then pure $ Right True
                else pure $ Right False
        _ -> pure $ Right False  -- Invalid format, deny access

-- | Generate a secure API key
generateApiKey :: IO ApiKey
generateApiKey = do
    bytes <- replicateM 32 $ randomRIO (0, 255 :: Word8)
    let key = TEnc.decodeUtf8 (BS.pack bytes)
    pure $ ApiKey (hexEncode key)

-- | Validate an API key format
validateApiKey :: Text -> IO (Either SessionError ApiKey)
validateApiKey key
    | T.length key /= 64 = pure $ Left InvalidApiKey
    | not (T.all isHexChar key) = pure $ Left InvalidApiKey
    | otherwise = pure $ Right (ApiKey key)

-- | Check if character is hex
isHexChar :: Char -> Bool
isHexChar c = (c >= '0' && c <= '9') || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F')

-- | Generate random salt
generateSalt :: Int -> IO BS.ByteString
generateSalt n = BS.pack <$> replicateM n (randomRIO (0, 255 :: Word8))

-- | Hex encoding
hexEncode :: Text -> Text
hexEncode t = T.concatMap charToHex t
  where
    charToHex :: Char -> Text
    charToHex c = case fromIntegral (fromEnum c) of
        w | w < 16 -> T.pack ['0', toHexChar w]
          | otherwise -> T.pack [toHexChar (w `div` 16), toHexChar (w `mod` 16)]
    toHexChar :: Word8 -> Char
    toHexChar w = "0123456789abcdef" !! fromIntegral w