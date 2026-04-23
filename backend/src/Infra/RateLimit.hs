-- | Rate limiting infrastructure
module Infra.RateLimit
  ( RateLimiter(..)
  , newRateLimiter
  , acquire
  , getRateLimiterRate
  , getRateLimiterCapacity
  ) where

import Control.Concurrent.STM (TVar, atomically, readTVar)
import Infra.RateLimit.TokenBucket (TokenBucket)
import qualified Infra.RateLimit.TokenBucket as TB

-- | A rate limiter based on token bucket algorithm
newtype RateLimiter = RateLimiter
  { rlBucket :: TokenBucket
  }

-- | Create a new rate limiter with specified rate and capacity
newRateLimiter :: Int -> Int -> IO RateLimiter
newRateLimiter rate capacity = do
  bucket <- TB.newTokenBucket rate capacity
  pure $ RateLimiter bucket

-- | Attempt to acquire a token from the rate limiter
--
-- Returns True if acquired, False if rate limited
acquire :: RateLimiter -> IO Bool
acquire = TB.acquireToken . rlBucket

-- | Attempt to acquire multiple tokens from the rate limiter
acquireMultiple :: RateLimiter -> Int -> IO Bool
acquireMultiple limiter n = TB.acquireTokens (rlBucket limiter) n

-- | Get the rate limiters configured rate
getRateLimiterRate :: RateLimiter -> IO Int
getRateLimiterRate = TB.getRate . rlBucket

-- | Get the rate limiters configured capacity
getRateLimiterCapacity :: RateLimiter -> IO Int
getRateLimiterCapacity = TB.getCapacity . rlBucket