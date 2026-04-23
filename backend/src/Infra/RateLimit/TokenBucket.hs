-- | Token Bucket rate limiting algorithm
module Infra.RateLimit.TokenBucket
  ( TokenBucket(..)
  , newTokenBucket
  , acquireToken
  , acquireTokens
  , resetBucket
  , getAvailableTokens
  , getRate
  , getCapacity
  ) where

import Control.Concurrent (threadDelay)
import Control.Concurrent.STM (TVar, STM, atomically, newTVar, readTVar, writeTVar, modifyTVar')
import Data.Time (UTCTime, getCurrentTime, addUTCTime, diffUTCTime)
import Numeric.Natural (Natural)

-- | Token bucket for rate limiting
--
-- Uses TVar/STM for thread-safe concurrent access
data TokenBucket = TokenBucket
  { tbTokens :: TVar Int
  , tbLastRefill :: TVar UTCTime
  , tbRate :: Int  -- ^ Tokens added per second
  , tbCapacity :: Int  -- ^ Maximum tokens
  }

-- | Create a new token bucket with given rate (tokens/sec) and capacity
newTokenBucket :: Int -> Int -> IO TokenBucket
newTokenBucket rate capacity = do
  now <- getCurrentTime
  tokensVar <- atomically $ newTVar capacity
  lastRefillVar <- atomically $ newTVar now
  pure TokenBucket
    { tbTokens = tokensVar
    , tbLastRefill = lastRefillVar
    , tbRate = rate
    , tbCapacity = capacity
    }

-- | Calculate tokens to add based on elapsed time
calculateRefill :: UTCTime -> UTCTime -> Int -> Int
calculateRefill lastRefill now rate = floor $ elapsed * fromIntegral rate
  where
    elapsed = diffUTCTime now lastRefill

-- | Refill tokens if needed, returns current token count (IO version)
refillAndGetIO :: TVar Int -> TVar UTCTime -> Int -> Int -> IO (Int, UTCTime)
refillAndGetIO tokensVar lastRefillVar rate capacity = do
  now <- getCurrentTime
  atomically $ do
    lastRefill <- readTVar lastRefillVar
    currentTokens <- readTVar tokensVar

    let newTokens = min capacity $ currentTokens + calculateRefill lastRefill now rate

    writeTVar tokensVar newTokens
    writeTVar lastRefillVar now

    pure (newTokens, now)

-- | Acquire a single token from the bucket
--
-- Returns True if token was acquired, False if rate limited
acquireToken :: TokenBucket -> IO Bool
acquireToken bucket = do
  (tokens, _) <- refillAndGetIO (tbTokens bucket) (tbLastRefill bucket) (tbRate bucket) (tbCapacity bucket)
  if tokens > 0
    then atomically $ do
      modifyTVar' (tbTokens bucket) (subtract 1)
      pure True
    else pure False

-- | Acquire multiple tokens from the bucket
--
-- Returns True if all tokens were acquired, False if rate limited
acquireTokens :: TokenBucket -> Int -> IO Bool
acquireTokens bucket requested = do
  (tokens, _) <- refillAndGetIO (tbTokens bucket) (tbLastRefill bucket) (tbRate bucket) (tbCapacity bucket)
  if tokens >= requested
    then atomically $ do
      modifyTVar' (tbTokens bucket) (subtract requested)
      pure True
    else pure False

-- | Reset the bucket to full capacity
resetBucket :: TokenBucket -> IO ()
resetBucket bucket = do
  now <- getCurrentTime
  atomically $ do
    writeTVar (tbTokens bucket) (tbCapacity bucket)
    writeTVar (tbLastRefill bucket) now

-- | Get current available tokens (after refill calculation)
getAvailableTokens :: TokenBucket -> IO Int
getAvailableTokens bucket = do
  (tokens, _) <- refillAndGetIO (tbTokens bucket) (tbLastRefill bucket) (tbRate bucket) (tbCapacity bucket)
  pure tokens

-- | Get the configured rate (tokens per second)
getRate :: TokenBucket -> IO Int
getRate bucket = pure (tbRate bucket)

-- | Get the configured capacity
getCapacity :: TokenBucket -> IO Int
getCapacity bucket = pure (tbCapacity bucket)