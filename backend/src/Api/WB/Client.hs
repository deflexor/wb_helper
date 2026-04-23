-- | WB API Client - Typed HTTP client for Wildberries API
-- Integrates rate limiting, retry logic, and caching
module Api.WB.Client
  ( -- * Client types
    WBClient(..)
  , WBClientConfig(..)
  , WBEndpoint(..)
    -- * Client construction
  , buildWBClient
  , defaultWBClientConfig
    -- * API operations
  , getProducts
  , updatePrice
  , getStatistics
    -- * HTTP operations
  , makeWBRequest
  , makeWBRequestWith
    -- * URL builders
  , wbBaseUrl
  , wbProductsUrl
  , wbPriceUpdateUrl
  , wbStatisticsUrl
  ) where

import Control.Monad (when, unless)
import Data.Aeson (Value, decode', encode)
import Data.ByteString.Lazy qualified as LBS
import Data.Text (Text)
import Data.Text qualified as T
import Network.HTTP.Client
  ( HttpException(..)
  , Manager
  , Request
  , RequestBody(..)
  , Response(..)
  , parseRequest
  , httpLbs
  , responseStatus
  , responseBody
  )
import Network.HTTP.Client qualified as HTTP
import Network.HTTP.Types (statusCode)
import System.IO (hPrint, stderr)

import Infra.HttpClient.Base
  ( HttpClientConfig(..)
  , HttpClient(..)
  , HttpClientError(..)
  , defaultHttpClientConfig
  , buildHttpClient
  , isRetryableException
  , withRetry
  )
import Infra.Cache (Cache, cacheGet, cacheSet, cacheInvalidate)
import Infra.RateLimit (RateLimiter, acquire)
import Api.WB.Types
import Api.WB.Response

-- | WB API base URL
wbBaseUrl :: Text
wbBaseUrl = "https://suppliers-api.wildberries.ru/api/v1"

-- | WB API endpoints
data WBEndpoint
  = WBProductsList
  | WBPriceUpdate
  | WBStatistics
  deriving (Show, Eq)

-- | Build URL for WB endpoint
wbEndpointToPath :: WBEndpoint -> Text
wbEndpointToPath endpoint = case endpoint of
  WBProductsList -> "/products"
  WBPriceUpdate -> "/products/prices"
  WBStatistics -> "/products/statistics"

-- | Full URL for products list
wbProductsUrl :: Text
wbProductsUrl = wbBaseUrl <> wbEndpointToPath WBProductsList

-- | Full URL for price update
wbPriceUpdateUrl :: Text
wbPriceUpdateUrl = wbBaseUrl <> wbEndpointToPath WBPriceUpdate

-- | Full URL for statistics
wbStatisticsUrl :: Text
wbStatisticsUrl = wbBaseUrl <> wbEndpointToPath WBStatistics

-- | WB Client configuration
data WBClientConfig = WBClientConfig
  { wbccApiKey         :: !Text
  , wbccHttpConfig     :: !HttpClientConfig
  , wbccCache          :: !(Maybe (Cache Value))
  , wbccCacheTtl       :: !Int  -- ^ Cache TTL in seconds
  , wbccRateLimiter    :: !RateLimiter
  } deriving (Show)

-- | Default WB client configuration
defaultWBClientConfig :: Text -> RateLimiter -> WBClientConfig
defaultWBClientConfig apiKey limiter = WBClientConfig
  { wbccApiKey = apiKey
  , wbccHttpConfig = defaultHttpClientConfig
  , wbccCache = Nothing
  , wbccCacheTtl = 300  -- 5 minutes default
  , wbccRateLimiter = limiter
  }

-- | WB API Client
data WBClient = WBClient
  { wbcHttpClient :: !HttpClient
  , wbcConfig     :: !WBClientConfig
  }

-- | Build a WB API client
buildWBClient :: WBClientConfig -> IO WBClient
buildWBClient config = do
  httpClient <- buildHttpClient (wbccHttpConfig config) (wbccRateLimiter config)
  pure $ WBClient httpClient config

-- | WB Client errors
data WBClientError
  = WBClientHttpError HttpClientError
  | WBClientParseError Text
  | WBClientCacheError String
  | WBClientRateLimited
  | WBClientInvalidResponse Text
  deriving (Show, Eq)

instance Exception WBClientError

-- | Auth header for WB API
wbAuthHeader :: Text -> HTTP.Header
wbAuthHeader apiKey = T.encodeUtf8 apiKey `seq` HTTP.Header "Authorization" (T.encodeUtf8 apiKey)

-- | Build request headers for WB API
buildWBHeaders :: Text -> HTTP.Header
buildWBHeaders apiKey = HTTP.Header "Authorization" (T.encodeUtf8 apiKey)

-- | Make a WB API request with rate limiting and retry
makeWBRequest
  :: WBClient
  -> WBEndpoint
  -> IO (Response LBS.ByteString)
makeWBRequest client endpoint = makeWBRequestWith client endpoint id

-- | Make a WB API request with custom request modifications
makeWBRequestWith
  :: WBClient
  -> WBEndpoint
  -> (Request -> Request)
  -> IO (Response LBS.ByteString)
makeWBRequestWith client endpoint modifyReq = do
  let config = wbcConfig client
      httpClient = wbcHttpClient client
      apiKey = wbccApiKey config
      limiter = wbccRateLimiter config

  -- Apply rate limiting
  rateLimited <- acquire limiter
  unless rateLimited $ throwIO WBClientRateLimited

  -- Build URL
  let url = case endpoint of
        WBProductsList -> wbProductsUrl
        WBPriceUpdate -> wbPriceUpdateUrl
        WBStatistics -> wbStatisticsUrl

  -- Check cache for GET requests (products list and statistics)
  let useCache = endpoint /= WBPriceUpdate
  cachedResult <- if useCache
    then do
      let mCache = wbccCache config
      case mCache of
        Nothing -> pure Nothing
        Just cache -> do
          cached <- cacheGet url cache
          case cached of
            Nothing -> pure Nothing
            Just val -> do
              -- Reconstruct response from cached value
              pure $ Just $ Response
                { responseStatus = HTTP.status200
                , responseHeaders = []
                , responseBody = encode val
                , responseCookieJar = HTTP.createCookieJar []
                , responseClose' = HTTP.ResponseClose $ return ()
                }
    else pure Nothing

  case cachedResult of
    Just response -> pure response
    Nothing -> do
      -- Make actual request with retry
      result <- withRetry (wbccHttpConfig config) limiter $ do
        request <- parseRequest $ T.unpack url
        let authHeader = buildWBHeaders apiKey
            modifiedRequest = modifyReq request
              { HTTP.requestHeaders = authHeader : HTTP.requestHeaders modifyReq
              , HTTP.requestBody = HTTP.requestBody modifyReq
              }
        logRequest modifiedRequest
        response <- httpLbs modifiedRequest (httpClientManager httpClient)
        logResponse response
        return response

      case result of
        Right resp -> do
          -- Cache successful GET responses
          when useCache $ do
            let mCache = wbccCache config
            case mCache of
              Nothing -> pure ()
              Just cache -> do
                case decode' (responseBody resp) of
                  Nothing -> pure ()
                  Just val -> cacheSet url val (wbccCacheTtl config) cache
          pure resp
        Left ex -> throwIO $ WBClientHttpError $ RequestFailed ex

-- | Get products list from WB API
getProducts :: WBClient -> IO (Either WBClientError [WBProduct])
getProducts client = do
  response <- makeWBRequest client WBProductsList
  let body = responseBody response
      status = statusCode $ responseStatus response

  if status /= 200
    then pure $ Left $ WBClientInvalidResponse $ "Status: " <> T.pack (show status)
    else case decode' body of
      Nothing -> pure $ Left $ WBClientParseError "Failed to decode response"
      Just val -> case parseProductsList val of
        Left err -> pure $ Left $ WBClientParseError err
        Right products -> pure $ Right products

-- | Update price on WB API
updatePrice :: WBClient -> WBPriceUpdate -> IO (Either WBClientError WBPriceUpdate)
updatePrice client priceUpdate = do
  response <- makeWBRequestWith client WBPriceUpdate $ \req -> req
    { HTTP.requestBody = RequestBodyLBS $ encode priceUpdate
    , HTTP.requestHeaders = ("Content-Type", "application/json") : HTTP.requestHeaders req
    }

  let body = responseBody response
      status = statusCode $ responseStatus response

  if status /= 200 && status /= 201
    then pure $ Left $ WBClientInvalidResponse $ "Status: " <> T.pack (show status)
    else case decode' body of
      Nothing -> pure $ Left $ WBClientParseError "Failed to decode response"
      Just val -> case parsePriceUpdate val of
        Left err -> pure $ Left $ WBClientParseError err
        Right updated -> pure $ Right updated

-- | Get statistics from WB API
getStatistics :: WBClient -> IO (Either WBClientError WBStatistics)
getStatistics client = do
  response <- makeWBRequest client WBStatistics
  let body = responseBody response
      status = statusCode $ responseStatus response

  if status /= 200
    then pure $ Left $ WBClientInvalidResponse $ "Status: " <> T.pack (show status)
    else case decode' body of
      Nothing -> pure $ Left $ WBClientParseError "Failed to decode response"
      Just val -> case parseStatistics val of
        Left err -> pure $ Left $ WBClientParseError err
        Right stats -> pure $ Right stats

-- | Invalidate cache for a specific endpoint
invalidateCache :: WBClient -> WBEndpoint -> IO ()
invalidateCache client endpoint = do
  let config = wbcConfig client
      mCache = wbccCache config
  case mCache of
    Nothing -> pure ()
    Just cache -> cacheInvalidate url cache
  where
    url = case endpoint of
      WBProductsList -> wbProductsUrl
      WBPriceUpdate -> wbPriceUpdateUrl
      WBStatistics -> wbStatisticsUrl

-- | Log HTTP request details
logRequest :: Request -> IO ()
logRequest req = do
  let method = HTTP.method req
      uri = HTTP.getUri req
  hPrint stderr $ "[WB-API] " <> show method <> " " <> show uri

-- | Log HTTP response details
logResponse :: Response a -> IO ()
logResponse resp = do
  let status = responseStatus resp
      code = statusCode status
  hPrint stderr $ "[WB-API] Response: " <> show code
