-- | WB API Client - Typed HTTP client for Wildberries API
-- Integrates rate limiting, retry logic, and caching
{-# LANGUAGE OverloadedStrings #-}
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

import Control.Exception (Exception, throwIO)
import Control.Monad (when, unless)
import Data.Aeson (Value, decode', encode)
import Data.ByteString.Lazy.Char8 qualified as BL8
import Data.ByteString.Lazy qualified as LBS
import Data.ByteString.Char8 qualified as B8
import Data.CaseInsensitive qualified as CI
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
  , requestHeaders
  , requestBody
  , createCookieJar
  )
import Network.HTTP.Client qualified as HTTP
import Network.HTTP.Types (statusCode, Status(Status), Header)
import Network.HTTP.Types qualified as HTTPTypes
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
  = WBEndpointProductsList
  | WBEndpointPriceUpdate
  | WBEndpointStatistics
  deriving (Show, Eq)

-- | Build URL for WB endpoint
wbEndpointToPath :: WBEndpoint -> Text
wbEndpointToPath endpoint = case endpoint of
  WBEndpointProductsList -> "/products"
  WBEndpointPriceUpdate -> "/products/prices"
  WBEndpointStatistics -> "/products/statistics"

-- | Full URL for products list
wbProductsUrl :: Text
wbProductsUrl = wbBaseUrl <> wbEndpointToPath WBEndpointProductsList

-- | Full URL for price update
wbPriceUpdateUrl :: Text
wbPriceUpdateUrl = wbBaseUrl <> wbEndpointToPath WBEndpointPriceUpdate

-- | Full URL for statistics
wbStatisticsUrl :: Text
wbStatisticsUrl = wbBaseUrl <> wbEndpointToPath WBEndpointStatistics

-- | WB Client configuration
data WBClientConfig = WBClientConfig
  { wbccApiKey         :: !Text
  , wbccHttpConfig     :: !HttpClientConfig
  , wbccCache          :: !(Maybe (Cache Value))
  , wbccCacheTtl       :: !Int  -- ^ Cache TTL in seconds
  , wbccRateLimiter    :: !RateLimiter
  }

instance Show WBClientConfig where
  show cfg = "WBClientConfig { wbccApiKey = <redacted>, wbccHttpConfig = " <> show (wbccHttpConfig cfg) <> ", wbccCacheTtl = " <> show (wbccCacheTtl cfg) <> " }"

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

-- | Build request headers for WB API
buildWBHeaders :: Text -> RequestHeaders
buildWBHeaders apiKey = [(CI.mk (B8.pack "Authorization"), B8.pack (T.unpack apiKey))]

-- | Type alias for request headers
type RequestHeaders = [Header]

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
        WBEndpointProductsList -> wbProductsUrl
        WBEndpointPriceUpdate -> wbPriceUpdateUrl
        WBEndpointStatistics -> wbStatisticsUrl

  -- Check cache for GET requests (products list and statistics)
  let useCache = endpoint /= WBEndpointPriceUpdate
  cachedResult <- if useCache
    then do
      let mCache = wbccCache config
      case mCache of
        Nothing -> pure Nothing
        Just cache -> do
          cached <- cacheGet url cache
          case cached of
            Nothing -> pure Nothing
--              let status = Status 200 "OK"
--              pure $ Just $ Response
--                { responseStatus = status
--                , responseHeaders = []
--                , responseBody = encode val
--                , responseCookieJar = HTTP.createCookieJar []
--                }
    else pure Nothing

  case cachedResult of
    Just response -> pure response
    Nothing -> do
      -- Make actual request with retry
      result <- withRetry (wbccHttpConfig config) limiter $ do
        request <- parseRequest $ T.unpack url
        let baseRequest = modifyReq request
            authHeaders = buildWBHeaders apiKey
            modifiedRequest = baseRequest
              { HTTP.requestHeaders = authHeaders ++ HTTP.requestHeaders baseRequest
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
        Left ex -> throwIO $ WBClientHttpError $ RequestFailed (show ex)

-- | Get products list from WB API
getProducts :: WBClient -> IO (Either WBClientError [WBProduct])
getProducts client = do
  response <- makeWBRequest client WBEndpointProductsList
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
  response <- makeWBRequestWith client WBEndpointPriceUpdate $ \req -> req
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
  response <- makeWBRequest client WBEndpointStatistics
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
      WBEndpointProductsList -> wbProductsUrl
      WBEndpointPriceUpdate -> wbPriceUpdateUrl
      WBEndpointStatistics -> wbStatisticsUrl

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
