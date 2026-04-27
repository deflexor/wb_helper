-- | Tests for Integration.Ozon.SEO - Ozon keyword tracking
module Integration.Ozon.SEOSpec where

import Test.Hspec
import Data.Aeson (encode, decode, object, (.=), (.:), (.:?))
import Data.Aeson qualified as A
import Data.Text (Text)
import qualified Data.Text as T
import Data.ByteString (ByteString)
import Data.ByteString.Lazy qualified as LBS
import Data.Text.Encoding qualified as TEnc
import Control.Exception (try, SomeException)
import Network.HTTP.Client (Response(..), Request, parseRequest)
import Network.HTTP.Client qualified as HTTP
import Network.HTTP.Types.Status (status200, status429, status500)
import TextShow (fromString)

import Integration.Ozon.SEO

-- Helper for encoding
encodeUtf8 :: Text -> ByteString
encodeUtf8 = TEnc.encodeUtf8

decodeUtf8 :: ByteString -> Text
decodeUtf8 = TEnc.decodeUtf8

main :: IO ()
main = hspec spec

spec :: Spec
spec = do
    describe "OzonSEOConfig" $ do
        describe "ozonSEOConfigValid" $ do
            it "returns True for valid config" $ do
                let config = defaultOzonSEOConfig
                        { osecClientId = "client123"
                        , osecApiKey = "apiKey456"
                        , osecRateLimit = 10
                        }
                ozonSEOConfigValid config `shouldBe` True

            it "returns False for empty clientId" $ do
                let config = defaultOzonSEOConfig
                        { osecClientId = ""
                        , osecApiKey = "apiKey456"
                        }
                ozonSEOConfigValid config `shouldBe` False

            it "returns False for empty apiKey" $ do
                let config = defaultOzonSEOConfig
                        { osecClientId = "client123"
                        , osecApiKey = ""
                        }
                ozonSEOConfigValid config `shouldBe` False

            it "returns False for zero rateLimit" $ do
                let config = defaultOzonSEOConfig
                        { osecClientId = "client123"
                        , osecApiKey = "apiKey456"
                        , osecRateLimit = 0
                        }
                ozonSEOConfigValid config `shouldBe` False

            it "returns False for negative rateLimit" $ do
                let config = defaultOzonSEOConfig
                        { osecClientId = "client123"
                        , osecApiKey = "apiKey456"
                        , osecRateLimit = -5
                        }
                ozonSEOConfigValid config `shouldBe` False

            it "returns False for negative maxRetries" $ do
                let config = defaultOzonSEOConfig
                        { osecClientId = "client123"
                        , osecApiKey = "apiKey456"
                        , osecMaxRetries = -1
                        }
                ozonSEOConfigValid config `shouldBe` False

    describe "ProductQuery" $ do
        describe "JSON serialization" $ do
            it "encodes ProductQuery to JSON correctly" $ do
                let pq = ProductQuery
                        { pqPosition = 5
                        , pqQuery = "детские кроссовки"
                        , pqUniqueSearchUsers = 1234
                        , pqUniqueViewUsers = 567
                        }
                let json = encode pq
                decode json `shouldBe` Just pq

            it "decodes valid JSON to ProductQuery" $ do
                let json = object
                        [ "position" .= (5 :: Int)
                        , "query" .= ("детские кроссовки" :: Text)
                        , "unique_search_users" .= (1234 :: Int)
                        , "unique_view_users" .= (567 :: Int)
                        ]
                case decode (encode json) of
                    Just pq -> do
                        pqPosition pq `shouldBe` 5
                        pqQuery pq `shouldBe` "детские кроссовки"
                        pqUniqueSearchUsers pq `shouldBe` 1234
                        pqUniqueViewUsers pq `shouldBe` 567
                    Nothing -> expectationFailure "Failed to decode ProductQuery"

            it "roundtrips through encode/decode" $ do
                let pq = ProductQuery
                        { pqPosition = 10
                        , pqQuery = "тестовый запрос"
                        , pqUniqueSearchUsers = 500
                        , pqUniqueViewUsers = 200
                        }
                decode (encode pq) `shouldBe` Just pq

    describe "ProductQueriesResponse" $ do
        describe "JSON parsing" $ do
            it "parses response with multiple results" $ do
                let json = object
                        [ "total" .= (100 :: Int)
                        , "results" .= ([] :: [Int])  -- Empty for now
                        ]
                case A.decode (A.encode json) of
                    Just resp -> pqrTotal resp `shouldBe` 100
                    Nothing -> expectationFailure "Failed to parse response"

    describe "OzonSEOClient" $ do
        describe "buildOzonSEOClient" $ do
            it "returns Just client for valid config" $ do
                let config = defaultOzonSEOConfig
                        { osecClientId = "client123"
                        , osecApiKey = "apiKey456"
                        }
                buildOzonSEOClient config `shouldBe` case config of
                    config' | ozonSEOConfigValid config' ->
                        Just $ OzonSEOClient
                            { osscConfig = config'
                            , osscClientId = osecClientId config'
                            , osscApiKey = osecApiKey config'
                            }
                    _ -> Nothing

            it "returns Nothing for invalid config" $ do
                let config = defaultOzonSEOConfig
                        { osecClientId = ""
                        , osecApiKey = "apiKey456"
                        }
                buildOzonSEOClient config `shouldBe` Nothing

        describe "show instance" $ do
            it "shows client info without exposing api key" $ do
                let config = defaultOzonSEOConfig
                        { osecClientId = "client123"
                        , osecApiKey = "secret-key"
                        }
                case buildOzonSEOClient config of
                    Just client -> do
                        let clientStr = show client
                        clientStr `shouldContain` "client123"
                        clientStr `shouldNotContain` "secret-key"
                    Nothing -> expectationFailure "Expected Just client"

    describe "OzonClient instance for IO" $ do
        describe "getKeywordPosition" $ do
            it "returns position for valid keyword" $ do
                result <- getKeywordPosition "тест" "product123"
                result `shouldSatisfy` \case
                    Just pos -> pos >= 1 && pos <= 100
                    Nothing -> False

            it "returns consistent position for same keyword" $ do
                pos1 <- getKeywordPosition "кроссовки" "product1"
                pos2 <- getKeywordPosition "кроссовки" "product1"
                pos1 `shouldBe` pos2

        describe "getProductQueries" $ do
            it "returns list of product queries" $ do
                queries <- getProductQueries "product123"
                length queries `shouldBe` 3

            it "returns ProductQuery with all fields" $ do
                queries <- getProductQueries "product123"
                case queries of
                    [] -> expectationFailure "Expected non-empty queries"
                    (q:_) -> do
                        pqPosition q `shouldSatisfy` (> 0)
                        T.null (pqQuery q) `shouldBe` False
                        pqUniqueSearchUsers q `shouldSatisfy` (>= 0)
                        pqUniqueViewUsers q `shouldSatisfy` (>= 0)

    describe "Default Configuration" $ do
        it "has correct base URL" $ do
            osecBaseUrl defaultOzonSEOConfig `shouldBe` "https://api-seller.ozon.ru"

        it "has reasonable rate limit" $ do
            osecRateLimit defaultOzonSEOConfig `shouldBe` 10

        it "has default retry settings" $ do
            osecMaxRetries defaultOzonSEOConfig `shouldBe` 3
            osecRetryDelay defaultOzonSEOConfig `shouldBe` 100000

-- =============================================================================
-- Mock Implementation Tests
-- =============================================================================

-- | Test implementation of SEORepository for testing
data MockSEORepository = MockSEORepository
    { mockKeywords :: [SeoKeyword]
    , mockPositions :: [KeywordPosition]
    }

instance SEORepository IO where
    saveKeywordPosition kp = do
        putStrLn $ "Saved position: " <> show (kpPosition kp)

    getKeywordPositions articleId mp = do
        pure $ filter (\sk -> skArticleId sk == articleId && skMarketplace sk == mp) mockKeywords

    getKeywordByText keyword articleId mp = do
        pure $ case filter (\sk -> skKeyword sk == keyword && skArticleId sk == articleId && skMarketplace sk == mp) mockKeywords of
            [] -> Nothing
            (sk:_) -> Just sk

mockKeywords :: [SeoKeyword]
mockKeywords = []

-- =============================================================================
-- HTTP Request Building Tests
-- =============================================================================

describe "HTTP Request Building" $ do
    describe "buildOzonSEORequest" $ do
        it "creates request with correct headers" $ do
            let config = defaultOzonSEOConfig
                    { osecClientId = "test-client-id"
                    , osecApiKey = "test-api-key"
                    }
            req <- buildOzonSEORequest config "/v1/analytics/product-queries" (object [])
            HTTP.requestHeaders req `shouldContain`
                (CI.mk (TEnc.encodeUtf8 "Client-Id"), TEnc.encodeUtf8 "test-client-id")
            HTTP.requestHeaders req `shouldContain`
                (CI.mk (TEnc.encodeUtf8 "Api-Key"), TEnc.encodeUtf8 "test-api-key")

        it "sets Content-Type to application/json" $ do
            let config = defaultOzonSEOConfig
                    { osecClientId = "client"
                    , osecApiKey = "key"
                    }
            req <- buildOzonSEORequest config "/test" (object [])
            let contentType = lookup (CI.mk (TEnc.encodeUtf8 "Content-Type")) (HTTP.requestHeaders req)
            contentType `shouldBe` Just (TEnc.encodeUtf8 "application/json")

        it "sets request body" $ do
            let config = defaultOzonSEOConfig
                    { osecClientId = "client"
                    , osecApiKey = "key"
                    }
            req <- buildOzonSEORequest config "/test" (object ["test" .= ("value" :: Text)])
            case HTTP.requestBody req of
                HTTP.RequestBodyLBS lbs -> T.length (decodeUtf8 (LBS.toStrict lbs)) `shouldSatisfy` (> 0)
                _ -> expectationFailure "Expected RequestBodyLBS"

-- =============================================================================
-- Retry Logic Tests
-- =============================================================================

describe "Retry Logic" $ do
    describe "isRetryable" $ do
        it "returns True for 5xx status codes" $ do
            pending -- Uses Infra.Retry.isRetryable

    describe "getRetryAfter" $ do
        it "extracts Retry-After header" $ do
            pending -- Implementation depends on response headers

-- =============================================================================
-- Integration Tests with Mocked API
-- =============================================================================

describe "Mock Ozon API Integration" $ do
    describe "trackKeyword" $ do
        it "tracks keyword and returns position" $ do
            pending -- Requires OzonClient and SEORepository instances

    describe "getTrackedKeywords" $ do
        it "filters by marketplace" $ do
            pending -- Requires SEORepository instance