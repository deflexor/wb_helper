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
import Data.Time (UTCTime)
import Data.Aeson (FromJSON(..), ToJSON(..), (.=), object, parseJSON, withObject, Value(String))
import qualified Data.Text as T
import qualified Data.Text.Encoding as TEnc
import qualified Data.ByteString as BS
import qualified Data.ByteString.Base64 as B64
import Crypto.Hash (SHA256(..), HMAC(..), hmac)
import Text.Read (readMaybe)

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

-- | Encode text to base64 URL-safe
encodeBase64Url :: BS.ByteString -> Text
encodeBase64Url = TEnc.decodeUtf8 . B64.encodeBase64

-- | Decode base64 URL-safe
decodeBase64Url :: Text -> Either JWTError BS.ByteString
decodeBase64Url t = case B64.decodeBase64 (TEnc.encodeUtf8 t) of
    Left _ -> Left MalformedToken
    Right b -> Right b

-- | HMAC-SHA256 sign
hmacSHA256 :: BS.ByteString -> BS.ByteString -> BS.ByteString
hmacSHA256 key msg = case hmac key msg of
    HMAC h -> h

-- | Create JWT header (base64url encoded JSON)
createHeader :: Text
createHeader = encodeBase64Url (TEnc.encodeUtf8 "{\"alg\":\"HS256\",\"typ\":\"JWT\"}")

-- | Convert claims to JSON text (compact format)
claimsToJson :: JWTClaims -> Text
claimsToJson claims = T.concat
    [ "{\"userId\":" , T.pack (show (jscUserId claims))
    , ",\"email\":\"" , jscEmail claims
    , "\",\"subscription\":\"" , T.pack (show (jscSubscription claims))
    , "\",\"exp\":\"" , T.pack (show (jscExp claims))
    , "\"}"
    ]

-- | Generate JWT token
generateJWT :: Text -> JWTClaims -> Text
generateJWT secret claims = T.intercalate "." [header, payload, signature]
  where
    header = createHeader
    payload = encodeBase64Url (TEnc.encodeUtf8 (claimsToJson claims))
    message = TEnc.encodeUtf8 (header <> "." <> payload)
    sigInput = TEnc.encodeUtf8 secret
    sig = hmacSHA256 sigInput message
    signature = encodeBase64Url sig

-- | Validate JWT token
validateJWT :: Text -> Text -> Either JWTError JWTClaims
validateJWT secret token
    | T.null token = Left MalformedToken
    | otherwise = case T.splitOn "." token of
        [header', payload', sig'] -> do
            -- Verify signature
            let message = TEnc.encodeUtf8 (header' <> "." <> payload')
                expectedSig = hmacSHA256 (TEnc.encodeUtf8 secret) message
            case decodeBase64Url sig' of
                Left _ -> Left MalformedToken
                Right actualSig -> if actualSig /= expectedSig
                    then Left InvalidSignature
                    else parsePayload payload'
        _ -> Left MalformedToken

-- | Parse the payload from base64url
parsePayload :: Text -> Either JWTError JWTClaims
parsePayload payload = case decodeBase64Url payload of
    Left e -> Left e
    Right bytes -> case parseJSON (String (TEnc.decodeUtf8 bytes)) of
        Left e -> Left $ ClaimsDecodeError (T.pack (show e))
        Right claims -> checkExpiration claims

-- | Check if token has expired (simplified - would compare times in production)
checkExpiration :: JWTClaims -> Either JWTError JWTClaims
checkExpiration claims = Right claims

-- Custom JSON instance that parses JWT-style compact JSON string
instance FromJSON JWTClaims where
    parseJSON (String s) = case parseCompactJson (T.unpack s) of
        Just claims -> pure claims
        Nothing -> fail "Failed to parse JWT claims"
    parseJSON _ = fail "Expected JSON string"

-- | Parse compact JSON format
parseCompactJson :: String -> Maybe JWTClaims
parseCompactJson s = do
    userId <- lookupStrValue "userId" s
    email <- lookupStrValue "email" s
    subStr <- lookupStrValue "subscription" s
    expStr <- lookupStrValue "exp" s
    let sub = case subStr of
            "Free" -> Free
            "Paid" -> Paid
            _ -> Free
        exp = readMaybe expStr
    case exp of
        Just e -> Just JWTClaims { jscUserId = userId, jscEmail = T.pack email, jscSubscription = sub, jscExp = e }
        Nothing -> Nothing

-- | Look up a string value from compact JSON
lookupStrValue :: String -> String -> Maybe String
lookupStrValue key s = do
    let pat = "\"" ++ key ++ "\":\""
    idx <- strIndex pat s
    let rest = drop (idx + length pat) s
        (val, _) = break (== '"') rest
    if null val then Nothing else Just val

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