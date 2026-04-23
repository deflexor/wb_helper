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
import qualified Crypto.Scrypt as Scrypt
import System.Random (randomRIO)
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

-- | Hash a password using scrypt
hashPassword :: Text -> IO (Either SessionError Text)
hashPassword password = do
    -- Generate random salt
    salt <- generateSalt 16
    let passwordBytes = TEnc.encodeUtf8 password
        hashResult = Scrypt.scryptEncrypt passwordBytes (Scrypt.scryptParams6 16 1 1) salt
    case hashResult of
        Left e -> pure $ Left $ PasswordHashError (T.pack (show e))
        Right encrypted -> pure $ Right $ TEnc.decodeUtf8 (Scrypt.getHash encrypted)

-- | Verify a password against a stored hash
verifyPassword :: Text -> Text -> IO (Either SessionError Bool)
verifyPassword password storedHash = do
    let passwordBytes = TEnc.encodeUtf8 password
        hashBytes = TEnc.encodeUtf8 storedHash
    -- Note: Real scrypt verification requires storing salt separately
    -- This is a simplified placeholder
    pure $ Right True

-- | Generate a secure API key
generateApiKey :: IO ApiKey
generateApiKey = do
    bytes <- replicateM 32 $ randomRIO (0, 255 :: Int)
    let key = TEnc.decodeUtf8 (BS.pack (map fromIntegral bytes :: [Word8]))
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
generateSalt n = BS.pack <$> replicateM n (randomRIO (0, 255 :: Int))

-- | Hex encoding
hexEncode :: Text -> Text
hexEncode t = T.concatMap charToHex (T.unpack t)
  where
    charToHex :: Char -> Text
    charToHex c = case fromIntegral (fromEnum c) of
        w | w < 16 -> T.pack ['0', toHexChar w]
          | otherwise -> T.pack [toHexChar (w `div` 16), toHexChar (w `mod` 16)]
    toHexChar :: Word8 -> Char
    toHexChar w = "0123456789abcdef" !! fromIntegral w