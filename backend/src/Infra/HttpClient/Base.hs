-- | Base HTTP client with rate limiting and retry logic
--
-- This module provides an HTTP client that integrates:
-- - Rate limiting via TokenBucket from Infra.RateLimit
-- - Retry logic with exponential backoff from Infra.Retry
-- - Request/Response logging via lens
-- - Proper error handling
module Infra.HttpClient.Base
  ( -- * Types
    HttpClientConfig(..)
  , HttpClient(..)
  , HttpClientError(..)
    -- * Configuration
  , defaultHttpClientConfig
  , httpClientConfigValid
    -- * Client construction
  , buildHttpClient
    -- * HTTP operations
  , makeRequest
  , makeRequestWith
    -- * Retry and rate limiting
  , isRetryableException
  , applyRateLimiting
  , withRetry
    -- * Logging
  , logRequest
  , logResponse
  ) where

import Control.Concurrent (threadDelay)
import Control.Concurrent.STM (TVar, atomically, readTVar, modifyTVar')
import Control.Exception (Exception, SomeException(..), catch, throwIO, try)
import Control.Monad (when, unless)
import Data.ByteString (ByteString)
import Data.ByteString.Lazy qualified as LBS
import Data.Text (Text)
import Data.Text qualified as T
import Network.HTTP.Client
  ( HttpException(..)
  , Manager
  , Request
  , Response(..)
  , parseRequest
  , httpLbs
  , responseStatus
  , responseBody
  )
import Network.HTTP.Client qualified as HTTP
import Network.HTTP.Types (Status, statusCode)
import System.IO (hPrint, stderr)

import Infra.RateLimit (RateLimiter(..), acquire)
import Infra.Retry (RetryConfig(..), defaultRetryConfig, calculateDelays, isRetryable, applyJitter)

-- | Configuration for HTTP client behavior
data HttpClientConfig = HttpClientConfig
  { hccMaxRetries :: Int      -- ^ Maximum number of retry attempts
  , hccBaseDelay  :: Int       -- ^ Base delay in microseconds
  , hccMaxDelay   :: Int       -- ^ Maximum delay in microseconds
  , hccJitter     :: Double    -- ^ Jitter factor (0.0 to 1.0)
  , hccTimeout    :: Int       -- ^ Request timeout in microseconds
  } deriving (Show, Eq)

-- | Default HTTP client configuration
defaultHttpClientConfig :: HttpClientConfig
defaultHttpClientConfig = HttpClientConfig
  { hccMaxRetries = 3
  , hccBaseDelay = 100000   -- 100ms
  , hccMaxDelay = 10000000  -- 10s
  , hccJitter = 0.1         -- 10%
  , hccTimeout = 30000000   -- 30s
  }

-- | HTTP client state
data HttpClient = HttpClient
  { httpClientManager :: Manager
  , httpClientConfig :: HttpClientConfig
  , httpClientLimiter :: RateLimiter
  }

-- | HTTP client errors
data HttpClientError
  = RateLimited
  | MaxRetriesExceeded String  -- Simplified: store error as string
  | RequestFailed String       -- Simplified: store error as string
  | ConfigurationInvalid String
  deriving (Show, Eq)

instance Exception HttpClientError

-- | Build an HTTP client with given configuration and rate limiter
buildHttpClient :: HttpClientConfig -> RateLimiter -> IO HttpClient
buildHttpClient config limiter = do
  unless (httpClientConfigValid config) $
    throwIO $ ConfigurationInvalid "Invalid HTTP client configuration"
  manager <- HTTP.newManager HTTP.defaultManagerSettings
  pure $ HttpClient manager config limiter

-- | Validate HTTP client configuration
httpClientConfigValid :: HttpClientConfig -> Bool
httpClientConfigValid config
  | hccMaxRetries config < 0 = False
  | hccJitter config < 0 = False
  | hccJitter config > 1 = False
  | hccBaseDelay config < 0 = False
  | hccMaxDelay config < 0 = False
  | hccTimeout config <= 0 = False
  | otherwise = True

-- | Check if an HttpException is retryable
-- Simplified version - retry on any exception for now
isRetryableException :: SomeException -> Bool
isRetryableException _ = True

-- | Apply rate limiting before an HTTP request
--
-- Returns True if token acquired, False if rate limited
applyRateLimiting :: RateLimiter -> IO Bool
applyRateLimiting = acquire

-- | Attempt request with retries and rate limiting
withRetry
  :: HttpClientConfig
  -> RateLimiter
  -> IO a
  -> IO (Either SomeException a)
withRetry config limiter action = go action 0
  where
    delays = calculateRetryDelays config
    maxRetries = hccMaxRetries config

    go :: IO a -> Int -> IO (Either SomeException a)
    go act attempt
      | attempt >= maxRetries = try act
      | otherwise = do
          success <- applyRateLimiting limiter
          if not success
            then do
              threadDelay 100000  -- 100ms delay when rate limited
              go act attempt
            else do
              result <- try act
              case result of
                Right a -> pure (Right a)
                Left ex
                  | isRetryableException ex -> do
                      let delay = delays !! attempt
                      jitteredDelay <- applyJitter delay (hccJitter config)
                      threadDelay jitteredDelay
                      go act (attempt + 1)
                  | otherwise -> pure (Left ex)

    calculateRetryDelays :: HttpClientConfig -> [Int]
    calculateRetryDelays cfg
      | maxRetries <= 0 = []
      | otherwise = take maxRetries $ iterate (*2) (hccBaseDelay cfg)

-- | Make an HTTP request with rate limiting and retry
makeRequest
  :: HttpClient
  -> Text  -- ^ URL
  -> IO (Response LBS.ByteString)
makeRequest client url = makeRequestWith client url id

-- | Make an HTTP request with custom request modifications
makeRequestWith
  :: HttpClient
  -> Text
  -> (Request -> Request)
  -> IO (Response LBS.ByteString)
makeRequestWith client urlText modifyReq = do
  let config = httpClientConfig client
      limiter = httpClientLimiter client

  -- Apply rate limiting
  rateLimited <- applyRateLimiting limiter
  unless rateLimited $ throwIO RateLimited

  -- Build request and apply retry logic
  result <- withRetry config limiter $ do
    request <- parseRequest (T.unpack urlText)
    let modifiedRequest = setRequestTimeout (hccTimeout config)
                         $ modifyReq request
    logRequest modifiedRequest
    response <- httpLbs modifiedRequest (httpClientManager client)
    logResponse response
    return response

  case result of
    Right resp -> pure resp
    Left ex -> throwIO $ RequestFailed (show ex)

  where
    setRequestTimeout :: Int -> Request -> Request
    setRequestTimeout micros req = req
      { HTTP.responseTimeout = HTTP.responseTimeoutMicro micros
      }

-- | Log HTTP request details (for debugging)
logRequest :: Request -> IO ()
logRequest req = do
  let method = HTTP.method req
      url = HTTP.getUri req
  hPrint stderr $ "[HTTP] " <> show method <> " " <> show url

-- | Log HTTP response details (for debugging)
logResponse :: Response a -> IO ()
logResponse resp = do
  let status = responseStatus resp
      code = statusCode status
  hPrint stderr $ "[HTTP] Response: " <> show code
