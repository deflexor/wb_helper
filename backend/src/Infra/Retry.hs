-- | Retry logic with exponential backoff for HTTP requests
module Infra.Retry
  ( RetryConfig(..)
  , defaultRetryConfig
  , calculateDelays
  , isRetryable
  , applyJitter
  , retryConfigValid
  , retryWithBackoff
  ) where

import Network.HTTP.Client (HttpException(..))
import Network.HTTP.Client qualified as HTTP
import Network.HTTP.Types (Status, statusCode)
import System.Random (randomRIO)
import Control.Concurrent (threadDelay)
import Control.Exception (try, SomeException(..), fromException)

-- | Configuration for retry behavior
data RetryConfig = RetryConfig
  { rcMaxRetries :: Int      -- ^ Maximum number of retry attempts
  , rcBaseDelay  :: Int       -- ^ Base delay in microseconds
  , rcMaxDelay   :: Int       -- ^ Maximum delay in microseconds
  , rcJitter     :: Double    -- ^ Jitter factor (0.0 to 1.0)
  } deriving (Show, Eq)

-- | Default retry configuration
--   3 retries, 100ms base delay, 10s max delay, 10% jitter
defaultRetryConfig :: RetryConfig
defaultRetryConfig = RetryConfig
  { rcMaxRetries = 3
  , rcBaseDelay = 100000
  , rcMaxDelay = 10000000
  , rcJitter = 0.1
  }

-- | Calculate exponential backoff delays
--   Returns a list of delays: [base, base*2, base*4, ..., maxDelay]
calculateDelays :: RetryConfig -> [Int]
calculateDelays config
  | rcMaxRetries config <= 0 = []
  | otherwise = take (rcMaxRetries config) $ exponentialDelays
  where
    exponentialDelays :: [Int]
    exponentialDelays = map (min (rcMaxDelay config)) $ iterate (*2) (rcBaseDelay config)

-- | Check if a SomeException wraps an HttpException that represents a transient failure
--   Note: Only matches on universally available constructors in http-client
isRetryable :: SomeException -> Bool
isRetryable e = case fromException e of
  Just (HTTP.HttpExceptionRequest _ (HTTP.StatusCodeException resp _)) ->
    let code = statusCode (HTTP.responseStatus resp)
    in code >= 500 && code < 600  -- 5xx errors are retryable
  Just (HTTP.HttpExceptionRequest _ HTTP.ResponseTimeout) -> True
  _ -> False

-- | Apply jitter to a delay value
--   Jitter spreads retry attempts to avoid thundering herd
--   Returns a delay in range [delay * (1-jitter), delay * (1+jitter)]
applyJitter :: Int -> Double -> IO Int
applyJitter delay jitter
  | jitter <= 0 = pure delay
  | jitter >= 1 = do
      -- Full jitter: [0, 2*delay]
      factor <- randomRIO (0.0, 2.0 :: Double)
      pure $ round $ fromIntegral delay * factor
  | otherwise = do
      -- Partial jitter: [1-jitter, 1+jitter]
      factor <- randomRIO (1.0 - jitter, 1.0 + jitter)
      pure $ round $ fromIntegral delay * factor

-- | Validate retry configuration
retryConfigValid :: RetryConfig -> Bool
retryConfigValid config
  | rcMaxRetries config < 0 = False
  | rcJitter config < 0 = False
  | rcJitter config > 1 = False
  | rcBaseDelay config < 0 = False
  | rcMaxDelay config < 0 = False
  | otherwise = True

-- | Retry an IO action with exponential backoff
retryWithBackoff :: RetryConfig -> IO a -> IO (Either SomeException a)
retryWithBackoff config action = go 0
  where
    delays = calculateDelays config
    go attempt
      | attempt >= rcMaxRetries config = try action
      | otherwise = do
          result <- try action
          case result of
            Right a -> pure (Right a)
            Left ex
              | isRetryable ex -> do
                  let delay = delays !! attempt
                  jitteredDelay <- applyJitter delay (rcJitter config)
                  threadDelay jitteredDelay
                  go (attempt + 1)
              | otherwise -> pure (Left ex)