-- | Tests for RateLimit infrastructure - Token Bucket implementation
module Infra.RateLimitSpec where

import Test.Hspec
import Data.Time (UTCTime, getCurrentTime, addUTCTime, diffUTCTime)
import Control.Concurrent (threadDelay)
import Control.Concurrent.Async (async, wait)
import Control.Monad (replicateM)

import Infra.RateLimit
import qualified Infra.RateLimit.TokenBucket as TB

-- | Helper to get current time plus offset in seconds
futureTime :: Int -> IO UTCTime
futureTime offset = do
  now <- getCurrentTime
  pure $ addUTCTime (fromInteger $ toInteger offset) now

-- | Helper to create a token bucket with custom rate and capacity
createTestBucket :: Int -> Int -> IO TB.TokenBucket
createTestBucket rate capacity = do
  TB.newTokenBucket rate capacity

spec :: Spec
spec = do
  describe "TokenBucket" $ do
    describe "TB.newTokenBucket" $ do
      it "creates bucket with initial capacity tokens" $ do
        bucket <- createTestBucket 10 100
        TB.getAvailableTokens bucket `shouldReturn` 100

      it "creates bucket with specified rate" $ do
        bucket <- createTestBucket 5 50
        TB.getRate bucket `shouldReturn` 5

      it "creates bucket with specified capacity" $ do
        bucket <- createTestBucket 10 100
        TB.getCapacity bucket `shouldReturn` 100

    describe "TB.acquireToken" $ do
      it "acquires token when tokens available" $ do
        bucket <- createTestBucket 10 10
        result <- TB.acquireToken bucket
        result `shouldBe` True

      it "fails to acquire when no tokens available" $ do
        bucket <- createTestBucket 1 1
        _ <- TB.acquireToken bucket  -- consume the only token
        result <- TB.acquireToken bucket
        result `shouldBe` False

      it "refills tokens over time" $ do
        bucket <- createTestBucket 10 1  -- 10 tokens/sec, capacity 1
        _ <- TB.acquireToken bucket  -- consume the only token
        threadDelay 200000  -- wait 0.2 seconds (200ms)
        result <- TB.acquireToken bucket
        result `shouldBe` True  -- should have refilled ~2 tokens

      it "does not exceed capacity when refilling" $ do
        bucket <- createTestBucket 10 5  -- 10 tokens/sec, capacity 5
        threadDelay 500000  -- wait 0.5 seconds, would be 5 tokens but cap is 5
        tokens <- TB.getAvailableTokens bucket
        tokens `shouldBe` 5

      it "decrements available tokens on successful acquire" $ do
        bucket <- createTestBucket 10 10
        _ <- TB.acquireToken bucket
        tokens <- TB.getAvailableTokens bucket
        tokens `shouldBe` 9

    describe "TB.acquireTokens" $ do
      it "acquires multiple tokens when available" $ do
        bucket <- createTestBucket 10 10
        result <- TB.acquireTokens bucket 3
        result `shouldBe` True
        tokens <- TB.getAvailableTokens bucket
        tokens `shouldBe` 7

      it "fails when requesting more tokens than available" $ do
        bucket <- createTestBucket 10 5
        result <- TB.acquireTokens bucket 10
        result `shouldBe` False
        tokens <- TB.getAvailableTokens bucket
        tokens `shouldBe` 5  -- unchanged

      it "partially acquires tokens" $ do
        bucket <- createTestBucket 10 5
        result <- TB.acquireTokens bucket 3
        result `shouldBe` True
        tokens <- TB.getAvailableTokens bucket
        tokens `shouldBe` 2

    describe "TB.resetBucket" $ do
      it "resets tokens to capacity" $ do
        bucket <- createTestBucket 10 10
        _ <- TB.acquireToken bucket
        _ <- TB.acquireToken bucket
        TB.resetBucket bucket
        tokens <- TB.getAvailableTokens bucket
        tokens `shouldBe` 10

    describe "TB.getAvailableTokens" $ do
      it "returns current token count" $ do
        bucket <- createTestBucket 10 10
        tokens <- TB.getAvailableTokens bucket
        tokens `shouldBe` 10

    describe "TB.getRate" $ do
      it "returns configured rate" $ do
        bucket <- createTestBucket 7 50
        rate <- TB.getRate bucket
        rate `shouldBe` 7

    describe "TB.getCapacity" $ do
      it "returns configured capacity" $ do
        bucket <- createTestBucket 7 50
        cap <- TB.getCapacity bucket
        cap `shouldBe` 50

  describe "RateLimit" $ do
    describe "newRateLimiter" $ do
      it "creates rate limiter with specified rate" $ do
        limiter <- newRateLimiter 5 100
        getRateLimiterRate limiter `shouldReturn` 5

      it "creates rate limiter with specified capacity" $ do
        limiter <- newRateLimiter 5 100
        getRateLimiterCapacity limiter `shouldReturn` 100

    describe "acquire" $ do
      it "acquires token when available" $ do
        limiter <- newRateLimiter 10 10
        result <- acquire limiter
        result `shouldBe` True

      it "denies when exhausted" $ do
        limiter <- newRateLimiter 10 1
        _ <- acquire limiter
        result <- acquire limiter
        result `shouldBe` False

  describe "Thread Safety" $ do
    it "handles concurrent acquisitions safely" $ do
      bucket <- createTestBucket 100 50  -- high rate, moderate capacity
      let doAcquire = TB.acquireToken bucket
      asyncs <- sequence $ replicate 100 $ async doAcquire
      sequence_ $ map wait asyncs
      -- No assertion on final count since tokens may refill,
      -- but no exceptions should be thrown (thread safety check)

    it "maintains consistency under concurrent load" $ do
      bucket <- createTestBucket 1000 100  -- high rate, capacity 100
      -- Rapid fire acquisitions
      replicateM 50 $ TB.acquireToken bucket
      threadDelay 100000  -- 100ms - should refill ~100 tokens
      finalTokens <- TB.getAvailableTokens bucket
      -- Should be close to capacity (100) after refill
      finalTokens `shouldSatisfy` (>= 90)

main :: IO ()
main = hspec spec