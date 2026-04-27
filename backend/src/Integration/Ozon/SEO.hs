-- | Ozon SEO Integration - Keyword tracking and position monitoring for Ozon marketplace
-- Provides functions to track keyword positions, fetch product queries, and handle rate limits
{-# LANGUAGE OverloadedStrings #-}
module Integration.Ozon.SEO
    ( -- * Ozon Client Interface
      OzonClient(..)
    , OzonSEOClient(..)

      -- * Product Query Types
    , ProductQuery(..)
    , ProductQueriesResponse(..)

      -- * SEO Operations
    , trackKeyword
    , getTrackedKeywords
    , getProductQueries
    , getKeywordPosition

      -- * Rate Limit Handling
    , handleRateLimit

      -- * Configuration
    , OzonSEOConfig(..)
    , defaultOzonSEOConfig
    , ozonSEOConfigValid

      -- * HTTP Client Integration
    , buildOzonSEOClient
    , callOzonSEOApi
    ) where

import Control.Concurrent (threadDelay)
import Control.Exception (try, SomeException, IOException)
import Control.Monad (when, forM)
import Data.Aeson (encode, decode, FromJSON(..), ToJSON(..), Value(..), object, (.=), (.:), (.:?))
import Data.Aeson qualified as A
import Data.ByteString (ByteString)
import Data.ByteString qualified as BS
import Data.ByteString.Lazy qualified as LBS
import Data.Text (Text)
import Data.Text qualified as T
import Data.Text.Encoding qualified as TEnc
import Data.CaseInsensitive qualified as CI
import Data.CaseInsensitive (CI)
import Data.Time (Day, UTCTime, getCurrentTime)
import GHC.Generics (Generic)
import Network.HTTP.Client (Request, Response(..), HttpException(..), httpLbs, parseRequest, RequestBody(RequestBodyLBS), requestHeaders)
import Network.HTTP.Client qualified as HTTP
import Network.HTTP.Types (statusCode, status429)
import System.Random (randomRIO)

import Effect.AppEffect (AppE, liftIO, Eff, ask, get, put)
import Effect.Error (AppError(..), throwError, catchError)
import Domain.SEO
import Domain.Marketplace
import Infra.Retry (RetryConfig(..), defaultRetryConfig, applyJitter, isRetryable)

-- =============================================================================
-- Ozon SEO Client Interface
-- =============================================================================

-- | Interface for Ozon SEO operations
-- Implement this interface to provide Ozon API access
class OzonClient m where
    -- | Get keyword position for a product
    getKeywordPosition :: Text -> Text -> m (Maybe Int)

    -- | Get all keyword queries for a product
    getProductQueries :: Text -> m [ProductQuery]

-- | Concrete Ozon SEO client implementation
data OzonSEOClient = OzonSEOClient
    { osscConfig :: OzonSEOConfig
    , osscClientId :: Text
    , osscApiKey :: Text
    } deriving (Show, Eq)

-- =============================================================================
-- Configuration
-- =============================================================================

-- | Ozon SEO configuration
data OzonSEOConfig = OzonSEOConfig
    { osecBaseUrl :: Text
    , osecClientId :: Text
    , osecApiKey :: Text
    , osecRateLimit :: Int           -- ^ Requests per second
    , osecMaxRetries :: Int           -- ^ Maximum retry attempts
    , osecRetryDelay :: Int           -- ^ Base delay in microseconds
    } deriving (Show, Eq)

-- | Default Ozon SEO configuration
defaultOzonSEOConfig :: OzonSEOConfig
defaultOzonSEOConfig = OzonSEOConfig
    { osecBaseUrl = "https://api-seller.ozon.ru"
    , osecClientId = ""
    , osecApiKey = ""
    , osecRateLimit = 10
    , osecMaxRetries = 3
    , osecRetryDelay = 100000
    }

-- | Validate Ozon SEO configuration
ozonSEOConfigValid :: OzonSEOConfig -> Bool
ozonSEOConfigValid config
    | T.null (osecClientId config) = False
    | T.null (osecApiKey config) = False
    | osecRateLimit config <= 0 = False
    | osecMaxRetries config < 0 = False
    | osecRetryDelay config < 0 = False
    | otherwise = True

-- =============================================================================
-- Product Query Types
-- =============================================================================

-- | Product query from Ozon analytics API
data ProductQuery = ProductQuery
    { pqPosition :: Int           -- ^ Keyword position in search results
    , pqQuery :: Text            -- ^ Search query/keyword
    , pqUniqueSearchUsers :: Int -- ^ Number of unique users who searched this query
    , pqUniqueViewUsers :: Int   -- ^ Number of unique users who viewed the product
    } deriving (Eq, Show, Generic)

-- | Response from product queries API
data ProductQueriesResponse = ProductQueriesResponse
    { pqrTotal :: Int
    , pqrResults :: [ProductQuery]
    } deriving (Eq, Show)

-- JSON instances for ProductQuery
instance ToJSON ProductQuery where
    toJSON pq = object
        [ "position" .= pqPosition pq
        , "query" .= pqQuery pq
        , "unique_search_users" .= pqUniqueSearchUsers pq
        , "unique_view_users" .= pqUniqueViewUsers pq
        ]

instance FromJSON ProductQuery where
    parseJSON = A.withObject "ProductQuery" $ \obj -> do
        pos <- obj .: "position"
        q <- obj .: "query"
        users <- obj .: "unique_search_users"
        views <- obj .: "unique_view_users"
        pure $ ProductQuery pos q users views

-- JSON instances for ProductQueriesResponse
instance FromJSON ProductQueriesResponse where
    parseJSON = A.withObject "ProductQueriesResponse" $ \obj -> do
        total <- obj .: "total"
        results <- obj .: "results"
        pure $ ProductQueriesResponse total results

-- =============================================================================
-- SEORepository Interface (for database operations)
-- =============================================================================

-- | Interface for SEO data persistence
-- This allows the SEO module to work with different database backends
class SEORepository m where
    -- | Save keyword position
    saveKeywordPosition :: KeywordPosition -> m ()

    -- | Get keyword positions for article
    getKeywordPositions :: Text -> Marketplace -> m [SeoKeyword]

    -- | Get keyword by text and article
    getKeywordByText :: Text -> Text -> Marketplace -> m (Maybe SeoKeyword)

-- =============================================================================
-- HTTP Client Operations
-- =============================================================================

-- | Build Ozon SEO HTTP client
buildOzonSEOClient :: OzonSEOConfig -> Maybe OzonSEOClient
buildOzonSEOClient config
    | ozonSEOConfigValid config = Just $ OzonSEOClient
        { osscConfig = config
        , osscClientId = osecClientId config
        , osscApiKey = osecApiKey config
        }
    | otherwise = Nothing

-- | Build HTTP request for Ozon SEO API
buildOzonSEORequest
    :: OzonSEOConfig
    -> Text            -- ^ Endpoint path
    -> Value           -- ^ Request body
    -> IO Request
buildOzonSEORequest config endpoint body = do
    let url = T.unpack $ osecBaseUrl config <> endpoint
    req <- HTTP.parseRequest url
    let reqBody = RequestBodyLBS (encode body)
    let clientIdBs = TEnc.encodeUtf8 (osecClientId config)
    let apiKeyBs = TEnc.encodeUtf8 (osecApiKey config)
    pure $ req
        { HTTP.requestBody = reqBody
        , HTTP.requestHeaders =
            [ (CI.mk (TEnc.encodeUtf8 "Client-Id"), clientIdBs)
            , (CI.mk (TEnc.encodeUtf8 "Api-Key"), apiKeyBs)
            , (CI.mk (TEnc.encodeUtf8 "Content-Type"), TEnc.encodeUtf8 "application/json")
            ]
        }

-- | Call Ozon SEO API with retry and rate limit handling
callOzonSEOApi
    :: (AppE es)
    => OzonSEOConfig
    -> Text
    -> Value
    -> Eff es (Either AppError Value)
callOzonSEOApi config endpoint body = do
    when (T.null (osecClientId config)) $
        throwError $ ExternalServiceError "Ozon Client-Id is missing"
    when (T.null (osecApiKey config)) $
        throwError $ ExternalServiceError "Ozon Api-Key is missing"

    let retryCfg = defaultRetryConfig
            { rcMaxRetries = osecMaxRetries config
            , rcBaseDelay = osecRetryDelay config
            }
    result <- sendWithRetry retryCfg config endpoint body

    case result of
        Left ex -> throwError $ ExternalServiceError $ T.pack $ show ex
        Right resp -> pure $ Right resp

-- | Send request with exponential backoff retry
sendWithRetry
    :: (AppE es)
    => RetryConfig
    -> OzonSEOConfig
    -> Text
    -> Value
    -> Eff es (Either SomeException (Response LBS.ByteString))
sendWithRetry retryCfg config endpoint body = do
    manager <- liftIO $ HTTP.newManager HTTP.defaultManagerSettings
    httpReq <- liftIO $ buildOzonSEORequest config endpoint body
    go retryCfg manager httpReq 0
  where
    go cfg mgr req attempt = do
        result <- liftIO $ try $ HTTP.httpLbs req mgr
        case result of
            Right resp
                | statusCode (HTTP.responseStatus resp) == 429 -> do
                    -- Rate limited - retry with backoff
                    let retryAfter = getRetryAfter resp
                    handle429 cfg mgr req attempt retryAfter
                | statusCode (HTTP.responseStatus resp) >= 500 -> do
                    -- Server error - retry
                    handle5xx cfg mgr req attempt
                | otherwise -> pure $ Right resp
            Left ex
                | isRetryable ex && attempt < rcMaxRetries cfg -> do
                    let delay = rcBaseDelay cfg * (2 ^ attempt)
                    jittered <- liftIO $ applyJitter delay 0.1
                    liftIO $ threadDelay jittered
                    go cfg mgr req (attempt + 1)
                | otherwise -> pure $ Left ex

    handle429 cfg mgr req attempt retryDelay = do
        let totalDelay = max retryDelay (rcBaseDelay cfg * (2 ^ attempt))
        jittered <- liftIO $ applyJitter totalDelay 0.1
        liftIO $ threadDelay jittered
        go cfg mgr req (attempt + 1)

    handle5xx cfg mgr req attempt = do
        if attempt < rcMaxRetries cfg
            then do
                let delay = rcBaseDelay cfg * (2 ^ attempt)
                jittered <- liftIO $ applyJitter delay 0.1
                liftIO $ threadDelay jittered
                go cfg mgr req (attempt + 1)
            else do
                -- Max retries exceeded - return error response
                pure $ Left $ userError "Max retries exceeded for 5xx error"

-- | Get Retry-After header value from 429 response
getRetryAfter :: Response a -> Int
getRetryAfter resp = case lookup "Retry-After" (HTTP.responseHeaders resp) of
    Just header -> case reads (T.unpack $ TEnc.decodeUtf8 header) of
        (n, _) : _ -> n * 1000000  -- Convert seconds to microseconds
        _ -> 1000000  -- Default 1 second
    Nothing -> 1000000  -- Default 1 second

-- =============================================================================
-- SEO Operations
-- =============================================================================

-- | Track keyword position for Ozon product
-- Fetches current position from Ozon API and stores in database
trackKeyword
    :: (OzonClient m, SEORepository m)
    => Text              -- ^ keyword
    -> Text              -- ^ product ID
    -> m (Maybe KeywordPosition)
trackKeyword keyword productId = do
    -- Get current position from Ozon API
    position <- getKeywordPosition keyword productId

    case position of
        Nothing -> pure Nothing
        Just pos -> do
            -- Get existing keyword record
            existing <- getKeywordByText keyword productId Ozon

            let newKp = case existing of
                    Just sk -> KeywordPosition
                        { kpId = skId sk
                        , kpKeyword = keyword
                        , kpArticleId = productId
                        , kpMarketplace = Ozon
                        , kpPosition = pos
                        , kpDate = undefined  -- Would use current day in real impl
                        }
                    Nothing -> KeywordPosition
                        { kpId = 0  -- Would generate ID in real impl
                        , kpKeyword = keyword
                        , kpArticleId = productId
                        , kpMarketplace = Ozon
                        , kpPosition = pos
                        , kpDate = undefined
                        }

            -- Save to database
            saveKeywordPosition newKp
            pure $ Just newKp

-- | Get all tracked keywords for a product on Ozon
getTrackedKeywords
    :: (SEORepository m)
    => Text              -- ^ product ID
    -> Marketplace       -- ^ must be Ozon
    -> m [SeoKeyword]
getTrackedKeywords productId marketplace
    | marketplace /= Ozon = pure []  -- Only Ozon supported for SEO tracking
    | otherwise = getKeywordPositions productId Ozon

-- | Get keyword position for product
-- Uses OzonClient implementation to fetch from API
getKeywordPosition
    :: (OzonClient m)
    => Text              -- ^ keyword
    -> Text              -- ^ product ID
    -> m (Maybe Int)
getKeywordPosition = getKeywordPosition

-- | Get all product queries from Ozon
getProductQueries
    :: (OzonClient m)
    => Text              -- ^ product ID
    -> m [ProductQuery]
getProductQueries = getProductQueries

-- =============================================================================
-- Rate Limit Handling
-- =============================================================================

-- | Handle rate limit with exponential backoff
-- Executes action, retries on 429 with exponential backoff
handleRateLimit :: (AppE es) => Int -> Eff es a -> Eff es a
handleRateLimit maxRetries action = go 0
  where
    go attempt
        | attempt >= maxRetries = action
        | otherwise = do
            result <- catchError (Right <$> action) $ \err -> do
                pure $ Left err
            case result of
                Right a -> pure a
                Left _
                    | attempt < maxRetries - 1 -> do
                        let delay = 100000 * (2 ^ attempt)  -- Base 100ms
                        jittered <- liftIO $ applyJitter delay 0.1
                        liftIO $ threadDelay jittered
                        go (attempt + 1)
                    | otherwise -> action

-- =============================================================================
-- Mock Ozon SEO Client (for testing)
-- =============================================================================

-- | Mock Ozon SEO client for testing
newtype MockOzonSEOClient m = MockOzonSEOClient
    { mockGetKeywordPosition :: Text -> Text -> m (Maybe Int)
    , mockGetProductQueries :: Text -> m [ProductQuery]
    }

instance OzonClient IO where
    getKeywordPosition keyword productId = do
        -- Mock implementation - return position based on keyword hash
        let hash = T.foldl (\acc c -> acc + fromEnum c) 0 keyword
        let pos = (hash `mod` 100) + 1
        pure $ Just pos

    getProductQueries productId = do
        -- Mock implementation - return sample queries
        pure
            [ ProductQuery 5 "детские кроссовки" 1234 567
            , ProductQuery 12 "кроссовки детские" 890 345
            , ProductQuery 25 "обувь детская" 456 123
            ]