-- | Ozon API client with typed HTTP requests, rate limiting, retry, and caching
{-# LANGUAGE OverloadedStrings #-}
module Api.Ozon.Client
  ( -- * Client creation
    OzonClient(..)
  , newOzonClient
  , newOzonClientWithCache
  , withOzonClient
    -- * Product operations
  , getProducts
  , getProductInfo
  , updatePrices
  , updateStocks
    -- * Statistics
  , getStatistics
    -- * Helpers
  , ozonAuthHeaders
  , ozonBaseUrl
  ) where

import Control.Exception (Exception, SomeException, bracket_, throwIO, try)
import Control.Monad (unless, forM_)
import Data.Aeson (encode, decode, FromJSON(parseJSON), ToJSON, Value)
import Data.ByteString qualified as BS
import Data.ByteString (fromStrict)
import Data.ByteString.Lazy as BL (ByteString, null)
import Data.CaseInsensitive qualified as CI
import Data.Text (Text)
import Data.Text qualified as T
import Data.Text.Encoding qualified as TE
import Data.Int (Int64)
import Network.HTTP.Client
  ( HttpException(..)
  , Manager
  , method
  , parseRequest
  , httpLbs
  , responseStatus
  , responseBody
  , Request
  , Response(..)
  )
import Network.HTTP.Client qualified as HTTP
import Network.HTTP.Types (statusCode)
import System.IO (hPrint, stderr)

import Api.Ozon.Types
import Api.Ozon.Response
import Infra.Cache (Cache, cacheGet, cacheSet, cacheInvalidate)
import Infra.HttpClient.Base
  ( HttpClientConfig(..)
  , HttpClient(..)
  , HttpClientError(..)
  , defaultHttpClientConfig
  , buildHttpClient
  , withRetry
  , applyRateLimiting
  )
import Infra.RateLimit (RateLimiter, newRateLimiter)

-- | Ozon API client
data OzonClient = OzonClient
  { ocHttpClient :: HttpClient
  , ocConfig :: OzonApiConfig
  , ocCache :: Maybe (Cache BL.ByteString)
  }

-- | Create a new Ozon API client
newOzonClient :: OzonApiConfig -> IO OzonClient
newOzonClient config = do
  unless (ozonApiConfigValid config) $
    throwIO $ userError "Invalid Ozon API configuration"
  limiter <- newRateLimiter (oacRateLimit config) (oacRateLimit config)
  httpClient <- buildHttpClient defaultHttpClientConfig limiter
  pure $ OzonClient httpClient config Nothing

-- | Create Ozon client with caching
newOzonClientWithCache :: OzonApiConfig -> Cache BL.ByteString -> IO OzonClient
newOzonClientWithCache config cache = do
  client <- newOzonClient config
  pure $ client { ocCache = Just cache }

-- | Execute operations with Ozon client
withOzonClient :: OzonApiConfig -> (OzonClient -> IO a) -> IO a
withOzonClient config action = do
  client <- newOzonClient config
  action client

-- | Ozon API base URL
ozonBaseUrl :: Text
ozonBaseUrl = "https://api-seller.ozon.ru"

-- | Generate authentication headers for Ozon API
ozonAuthHeaders :: OzonAuth -> [(Text, Text)]
ozonAuthHeaders auth =
  [ ("Client-Id", oaClientId auth)
  , ("Api-Key", oaApiKey auth)
  ]

-- | Convert headers to HTTP header list
textHeadersToBs :: [(Text, Text)] -> [(CI.CI BS.ByteString, BS.ByteString)]
textHeadersToBs headers = map convert headers
  where
    convert :: (Text, Text) -> (CI.CI BS.ByteString, BS.ByteString)
    convert (k, v) = (CI.mk (TE.encodeUtf8 k), TE.encodeUtf8 v)

-- | Build Ozon API URL
buildOzonUrl :: OzonEndpoint -> Text
buildOzonUrl endpoint = ozonBaseUrl <> ozonEndpointPath endpoint

-- | Make authenticated request to Ozon API
ozonRequest
  :: ToJSON a
  => OzonClient
  -> OzonEndpoint
  -> a
  -> IO (Response BL.ByteString)
ozonRequest client endpoint body = do
  let config = ocConfig client
      httpClient = ocHttpClient client
      limiter = httpClientLimiter httpClient
      httpConfig = httpClientConfig httpClient

  -- Apply rate limiting
  rateLimited <- applyRateLimiting limiter
  unless rateLimited $ throwIO RateLimited

  -- Make request with retry
  result <- withRetry httpConfig limiter $ do
    let url = T.unpack $ buildOzonUrl endpoint
    request <- parseRequest url
    let authHeaders = textHeadersToBs
          [ ("Client-Id", oacClientId config)
          , ("Api-Key", oacApiKey config)
          , ("Content-Type", "application/json")
          ]
        modifiedRequest = request
          { HTTP.requestHeaders = authHeaders
          , HTTP.requestBody = HTTP.requestBody request
          }
    logRequest modifiedRequest
    response <- httpLbs modifiedRequest (httpClientManager httpClient)
    logResponse response
    return response

  case result of
    Right resp -> pure resp
    Left ex -> throwIO $ RequestFailed (show ex)

-- | Get products list from Ozon
getProducts :: OzonClient -> OzonProductsRequest -> IO (Either OzonApiError [OzonProduct])
getProducts client request = do
  let cacheKey = T.pack $ "ozon_products_" <> show (oprOffset request)
  cachedResult <- maybe (pure Nothing) (\c -> Just <$> cacheGet cacheKey c) (ocCache client)
  case cachedResult of
    Just (Just cached) | not (BL.null cached) -> do
      liftEither $ parseOzonProducts =<< maybeDecode cached
    _ -> do
      result <- try @SomeException $ ozonRequest client EndpointProducts request
      case result of
        Left ex -> pure $ Left $ OzonNetworkError (T.pack $ show ex)
        Right resp -> do
          let body = responseBody resp
              status = statusCode $ responseStatus resp
          if status >= 200 && status < 300
            then do
              forM_ (ocCache client) $ \c -> cacheSet cacheKey body 300 c
              liftEither $ parseOzonProducts =<< maybeDecode body
            else do
              pure $ Left $ OzonServerError status "API error"

-- | Get single product info
getProductInfo :: OzonClient -> Int64 -> IO (Either OzonApiError OzonProduct)
getProductInfo client productId = do
  let cacheKey = T.pack $ "ozon_product_" <> show productId
  cachedResult <- maybe (pure Nothing) (\c -> Just <$> cacheGet cacheKey c) (ocCache client)
  case cachedResult of
    Just (Just cached) | not (BL.null cached) -> do
      liftEither $ parseOzonProduct =<< maybeDecode cached
    _ -> do
      response <- try @SomeException $ ozonRequest client EndpointProductInfo productId
      case response of
        Left ex -> pure $ Left $ OzonNetworkError (T.pack $ show ex)
        Right response -> do
          let body = responseBody response
              status = statusCode $ responseStatus response
          if status >= 200 && status < 300
            then do
              forM_ (ocCache client) $ \c -> cacheSet cacheKey body 300 c
              liftEither $ parseOzonProduct =<< maybeDecode body
            else do
              pure $ Left $ OzonServerError status "API error"

-- | Update product prices
updatePrices :: OzonClient -> OzonPriceUpdateRequest -> IO (Either OzonApiError Bool)
updatePrices client request = do
  response <- try @SomeException $ ozonRequest client EndpointPricesUpdate request
  case response of
    Left ex -> pure $ Left $ OzonNetworkError (T.pack $ show ex)
    Right resp -> do
      let body = responseBody resp
          status = statusCode $ responseStatus resp
      if status >= 200 && status < 300
        then do
          forM_ (ocCache client) $ \c -> cacheInvalidate "ozon_products_" c
          pure $ Right True
        else do
          pure $ Left $ OzonServerError status "API error"

-- | Update product stocks
updateStocks :: OzonClient -> [OzonStock] -> IO (Either OzonApiError Bool)
updateStocks client stocks = do
  let cacheKey = "ozon_stocks"
  response <- try @SomeException $ ozonRequest client EndpointStocksUpdate stocks
  case response of
    Left ex -> pure $ Left $ OzonNetworkError (T.pack $ show ex)
    Right resp -> do
      let body = responseBody resp
          status = statusCode $ responseStatus resp
      if status >= 200 && status < 300
        then do
          forM_ (ocCache client) $ \c -> cacheInvalidate (T.pack cacheKey) c
          pure $ Right True
        else do
          pure $ Left $ OzonServerError status "API error"

-- | Get product statistics
getStatistics :: OzonClient -> IO (Either OzonApiError Value)
getStatistics client = do
  let cacheKey = "ozon_stats"
  cachedResult <- maybe (pure Nothing) (\c -> Just <$> cacheGet (T.pack cacheKey) c) (ocCache client)
  case cachedResult of
    Just (Just cached) | not (BL.null cached) -> do
      liftEither $ maybeDecode cached
    _ -> do
      response <- try @SomeException $ ozonRequest client EndpointStatistics ()
      case response of
        Left ex -> pure $ Left $ OzonNetworkError (T.pack $ show ex)
        Right response -> do
          let body = responseBody response
              status = statusCode $ responseStatus response
          if status >= 200 && status < 300
            then do
              forM_ (ocCache client) $ \c -> cacheSet (T.pack cacheKey) body 60 c
              liftEither $ maybeDecode body
            else do
              pure $ Left $ OzonServerError status "API error"

-- Helper functions
liftEither :: Either Text a -> IO (Either OzonApiError a)
liftEither (Left err) = pure $ Left $ OzonParseError err
liftEither (Right v) = pure $ Right v

maybeDecode :: BL.ByteString -> Either Text Value
maybeDecode bs = case decode bs of
  Nothing -> Left "Failed to decode JSON"
  Just v -> Right v

logRequest :: Request -> IO ()
logRequest req = do
  let method = HTTP.method req
      url = HTTP.getUri req
  hPrint stderr $ "[HTTP] " <> show method <> " " <> show url

logResponse :: Response a -> IO ()
logResponse resp = do
  let status = responseStatus resp
      code = statusCode status
  hPrint stderr $ "[HTTP] Response: " <> show code