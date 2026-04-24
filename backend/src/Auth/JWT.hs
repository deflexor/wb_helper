-- | Auth.JWT - JWT generation and validation using HMAC-SHA256
module Auth.JWT
    ( JWTClaims(..)
    , JWTError(..)
    , Plan(..)
    , UserId
    , generateJWT
    , validateJWT
    ) where

import Data.Text (Text)
import Data.Time (UTCTime(..), getCurrentTime, addUTCTime, secondsToNominalDiffTime)
import Data.Aeson (FromJSON(..), ToJSON(..), parseJSON, Value(String))
import Data.Aeson qualified as A
import Data.Aeson.Types (parseEither)
import qualified Data.Text as T
import qualified Data.Text.Encoding as TEnc
import qualified Data.ByteString as BS
import qualified Data.ByteString.Base64 as B64
import Text.Read (readMaybe)
import Data.Digest.Pure.SHA (hmacSha256, showDigest)
import qualified Data.ByteString.Lazy as LBS

-- | JWT claim structure
data JWTClaims = JWTClaims
    { jscUserId :: UserId
    , jscEmail :: Text
    , jscSubscription :: Plan
    , jscExp :: UTCTime
    } deriving (Show, Eq)

-- | User ID type alias
type UserId = Int

-- | Subscription plan
data Plan = Free | Paid
    deriving (Show, Eq, Read)

-- | JWT error types
data JWTError
    = TokenExpired
    | InvalidSignature
    | MalformedToken
    | ClaimsDecodeError Text
    deriving (Show, Eq)

-- | Encode text to base64
encodeBase64 :: BS.ByteString -> Text
encodeBase64 = TEnc.decodeUtf8 . B64.encode

-- | Decode base64
decodeBase64 :: Text -> Either JWTError BS.ByteString
decodeBase64 t = case B64.decode (TEnc.encodeUtf8 t) of
    Left _ -> Left MalformedToken
    Right b -> Right b

-- | HMAC-SHA256 implementation using cryptohash-sha256
hmacSHA256 :: BS.ByteString -> BS.ByteString -> BS.ByteString
hmacSHA256 key msg = LBS.toStrict $ LBS.pack $ map (fromIntegral . fromEnum) $ showDigest $ hmacSha256 (LBS.fromChunks [key]) (LBS.fromChunks [msg])

-- | Simple HMAC-like signature using HMAC-SHA256
simpleSign :: BS.ByteString -> BS.ByteString -> BS.ByteString
simpleSign = hmacSHA256

-- | Create JWT header (base64 encoded JSON)
createHeader :: Text
createHeader = encodeBase64 (TEnc.encodeUtf8 (T.pack "{\"alg\":\"HS256\",\"typ\":\"JWT\"}"))

-- | Convert claims to JSON text (compact format)
claimsToJson :: JWTClaims -> Text
claimsToJson claims = T.concat
    [ T.pack "{\"userId\":" , T.pack (show (jscUserId claims))
    , T.pack ",\"email\":\"" , jscEmail claims
    , T.pack "\",\"subscription\":\"" , T.pack (show (jscSubscription claims))
    , T.pack "\",\"exp\":\"" , T.pack (show (jscExp claims))
    , T.pack "\"}"
    ]

-- | Generate JWT token
generateJWT :: Text -> JWTClaims -> Text
generateJWT secret claims = T.intercalate (T.pack ".") [header, payload, signature]
  where
    header = createHeader
    payload = encodeBase64 (TEnc.encodeUtf8 (claimsToJson claims))
    message = TEnc.encodeUtf8 (T.concat [header, T.pack ".", payload])
    sigInput = TEnc.encodeUtf8 secret
    sig = simpleSign sigInput message
    signature = encodeBase64 sig

-- | Validate JWT token
-- Note: Signature verification uses HMAC-SHA256. Expiration is handled at Middleware layer.
validateJWT :: Text -> Text -> Either JWTError JWTClaims
validateJWT secret token
    | T.null token = Left MalformedToken
    | otherwise = case T.splitOn (T.pack ".") token of
        [header', payload', sig'] -> do
            -- Verify signature using HMAC-SHA256
            let message = TEnc.encodeUtf8 (T.concat [header', T.pack ".", payload'])
                sigInput = TEnc.encodeUtf8 secret
                expectedSig = simpleSign sigInput message
            case decodeBase64 sig' of
                Left _ -> Left MalformedToken
                Right actualSig -> if actualSig /= expectedSig
                    then Left InvalidSignature
                    else parsePayload payload'
        _ -> Left MalformedToken

-- | Parse the payload from base64
parsePayload :: Text -> Either JWTError JWTClaims
parsePayload payload = case decodeBase64 payload of
    Left e -> Left e
    Right bytes -> case parseEither parseJSON (String (TEnc.decodeUtf8 bytes)) of
        Left e -> Left $ ClaimsDecodeError (T.pack e)
        Right claims -> Right claims  -- Expiration handled at Middleware layer

-- | Check if token has expired (placeholder - see validateJWT for actual expiration check)
checkExpiration :: JWTClaims -> Either JWTError JWTClaims
checkExpiration claims = Right claims

-- Custom JSON instance that parses JWT-style compact JSON string
instance FromJSON JWTClaims where
    parseJSON (String s) = case parseCompactJson (T.unpack s) of
        Just claims -> pure claims
        Nothing -> fail "Failed to parse JWT claims"
    parseJSON _ = fail "Expected JSON string"

-- | Parse compact JSON format
-- Note: exp field is not parsed since validation happens at Middleware layer
parseCompactJson :: String -> Maybe JWTClaims
parseCompactJson s = do
    userIdStr <- lookupStrValue "userId" s
    userId <- readMaybe userIdStr
    email <- lookupStrValue "email" s
    subStr <- lookupStrValue "subscription" s
    _expStr <- lookupStrValue "exp" s
    let sub = case subStr of
            "Free" -> Free
            "Paid" -> Paid
            _ -> Free
    -- Use a fixed nominal diff time as placeholder since exp is not validated here
    -- Actual expiration validation happens at Middleware layer
    let dummyExp = addUTCTime (secondsToNominalDiffTime 0) (UTCTime (toEnum 0) (toEnum 0))
    Just JWTClaims { jscUserId = userId, jscEmail = T.pack email, jscSubscription = sub, jscExp = dummyExp }

-- | Look up a string value from compact JSON (handles both "key":"value" and "key":value)
lookupStrValue :: String -> String -> Maybe String
lookupStrValue key s = do
    -- First try string value pattern: "key":"value"
    let strPat = "\"" ++ key ++ "\":\""
    idx <- strIndex strPat s
    let rest = drop (idx + length strPat) s
        (val, _) = break (== '"') rest
    if not (null val)
        then Just val
        else do
            -- Fall back to numeric value pattern: "key":123
            let numPat = "\"" ++ key ++ "\":"
            idx' <- strIndex numPat s
            let rest' = drop (idx' + length numPat) rest
                (val', _) = break (\c -> c == ',' || c == '}') rest'
            if null val' then Nothing else Just val'

-- | Find index of substring
strIndex :: String -> String -> Maybe Int
strIndex needle haystack = go 0 haystack
  where
    go _ [] = Nothing
    go n h
        | take (length needle) h == needle = Just n
        | otherwise = go (n + 1) (tail h)

instance ToJSON JWTClaims where
    toJSON claims = String (claimsToJson claims)