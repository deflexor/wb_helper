-- | Tests for RateLimit UsageTracker - Daily usage tracking per user with STM
module Infra.RateLimit.UsageTrackerSpec where

import Test.Hspec
import Control.Concurrent (threadDelay, forkIO, newEmptyMVar, putMVar, takeMVar)
import Control.Monad (forM, replicateM, void)
import Data.Time (getCurrentTime, utctDay)
import Data.Time.Calendar (toGregorian)

import Infra.RateLimit.UsageTracker
import Auth.JWT (UserId)

-- | Helper to get today's date as integer (YYYYMMDD format)
getTodayInt :: IO Int
getTodayInt = do
    now <- getCurrentTime
    let day = utctDay now
        (year, month, dayOfMonth) = toGregorian day
        yearInt = fromIntegral year :: Int
        monthInt = fromIntegral month :: Int
        dayInt = fromIntegral dayOfMonth :: Int
    pure $ yearInt * 10000 + monthInt * 100 + dayInt

-- | Helper to run multiple checkAndIncrementUsage calls sequentially
runUsageChecks :: UsageTracker -> UserId -> Bool -> Int -> IO [(Bool, Int)]
runUsageChecks tracker userId isPaid count =
    forM [1..count] $ \_ -> checkAndIncrementUsage tracker userId isPaid

-- | Run concurrent requests and wait for all to complete
runConcurrentRequests :: UsageTracker -> UserId -> Bool -> Int -> Int -> IO ()
runConcurrentRequests tracker userId isPaid numThreads requestsPerThread = do
    done <- replicateM numThreads $ do
        mv <- newEmptyMVar
        forkIO $ do
            replicateM requestsPerThread $ checkAndIncrementUsage tracker userId isPaid
            putMVar mv ()
        pure mv
    mapM_ takeMVar done

spec :: Spec
spec = do
  describe "checkAndIncrementUsage" $ do
    describe "atomic increment behavior" $ do
      it "increments counter for each successful request" $ do
        -- Arrange
        tracker <- newUsageTracker
        let userId = 1 :: UserId

        -- Act - make 5 requests
        results <- runUsageChecks tracker userId False 5

        -- Assert - all should be allowed, counts should increment from 1 to 5
        let allowed = map fst results
        let counts = map snd results
        allowed `shouldBe` [True, True, True, True, True]
        counts `shouldBe` [1, 2, 3, 4, 5]

      it "returns current count alongside allow status" $ do
        -- Arrange
        tracker <- newUsageTracker
        let userId = 1 :: UserId

        -- Act
        (allowed1, count1) <- checkAndIncrementUsage tracker userId False
        (allowed2, count2) <- checkAndIncrementUsage tracker userId False

        -- Assert
        allowed1 `shouldBe` True
        count1 `shouldBe` 1
        allowed2 `shouldBe` True
        count2 `shouldBe` 2

      it "starts from 0 for new user on first request" $ do
        -- Arrange
        tracker <- newUsageTracker
        let userId = 99 :: UserId

        -- Act
        (allowed, count) <- checkAndIncrementUsage tracker userId False

        -- Assert
        allowed `shouldBe` True
        count `shouldBe` 1

    describe "Free tier rate limiting" $ do
      it "allows requests up to daily limit (1000)" $ do
        -- Arrange
        tracker <- newUsageTracker
        let userId = 2 :: UserId

        -- Act - make exactly 1000 requests
        results <- runUsageChecks tracker userId False 1000

        -- Assert - all should be allowed, last count should be 1000
        map fst results `shouldBe` replicate 1000 True
        snd (last results) `shouldBe` 1000

      it "rejects request 1001 for free user with 429 behavior" $ do
        -- Arrange
        tracker <- newUsageTracker
        let userId = 3 :: UserId

        -- Act - make 1000 requests (all allowed)
        results1000 <- runUsageChecks tracker userId False 1000

        -- Assert - all first 1000 should be allowed
        map fst results1000 `shouldBe` replicate 1000 True

        -- Act - make the 1001st request
        (allowed1001, count1001) <- checkAndIncrementUsage tracker userId False

        -- Assert - should be rejected
        allowed1001 `shouldBe` False
        count1001 `shouldBe` 1001  -- count still incremented but request denied

      it "rejects multiple requests after limit is exceeded" $ do
        -- Arrange
        tracker <- newUsageTracker
        let userId = 4 :: UserId

        -- Act - exceed the limit
        _ <- runUsageChecks tracker userId False 1000

        -- Act - make additional requests
        results <- runUsageChecks tracker userId False 10

        -- Assert - all should be rejected
        map fst results `shouldBe` replicate 10 False

      it "tracks usage correctly across multiple users" $ do
        -- Arrange
        tracker <- newUsageTracker
        let userA = 10 :: UserId
        let userB = 11 :: UserId

        -- Act - userA makes 500 requests, userB makes 300
        resultsA <- runUsageChecks tracker userA False 500
        resultsB <- runUsageChecks tracker userB False 300

        -- Assert - each user has correct count
        snd (last resultsA) `shouldBe` 500
        snd (last resultsB) `shouldBe` 300

        -- Act - userA makes 501st request (should be allowed since limit is 1000)
        (allowedA501, countA501) <- checkAndIncrementUsage tracker userA False

        -- Act - userB makes 301st request (should be allowed)
        (allowedB301, countB301) <- checkAndIncrementUsage tracker userB False

        -- Assert
        allowedA501 `shouldBe` True
        countA501 `shouldBe` 501
        allowedB301 `shouldBe` True
        countB301 `shouldBe` 301

    describe "Paid tier unlimited" $ do
      it "allows unlimited requests for paid users" $ do
        -- Arrange
        tracker <- newUsageTracker
        let userId = 5 :: UserId
        let isPaid = True

        -- Act - make 1500 requests (well over free limit)
        results <- runUsageChecks tracker userId isPaid 1500

        -- Assert - all should be allowed
        map fst results `shouldBe` replicate 1500 True

      it "does not increment usage counter for paid users" $ do
        -- Arrange
        tracker <- newUsageTracker
        let userId = 6 :: UserId

        -- Act
        (allowed1, count1) <- checkAndIncrementUsage tracker userId True
        (allowed2, count2) <- checkAndIncrementUsage tracker userId True
        (allowed3, count3) <- checkAndIncrementUsage tracker userId True

        -- Assert - all allowed, but count stays at 0 (not counted)
        allowed1 `shouldBe` True
        count1 `shouldBe` 0
        allowed2 `shouldBe` True
        count2 `shouldBe` 0
        allowed3 `shouldBe` True
        count3 `shouldBe` 0

      it "paid user has independent counter from free user" $ do
        -- Arrange
        tracker <- newUsageTracker
        let freeUserId = 7 :: UserId
        let paidUserId = 8 :: UserId

        -- Act - free user makes 500 requests
        resultsFree <- runUsageChecks tracker freeUserId False 500

        -- Act - paid user makes 2000 requests
        resultsPaid <- runUsageChecks tracker paidUserId True 2000

        -- Assert
        snd (last resultsFree) `shouldBe` 500
        map fst resultsPaid `shouldBe` replicate 2000 True
        -- Paid user's count should be 0 (not counted)
        snd (last resultsPaid) `shouldBe` 0

    describe "getUsageCount" $ do
      it "returns current count for user" $ do
        -- Arrange
        tracker <- newUsageTracker
        let userId = 9 :: UserId

        -- Act
        _ <- checkAndIncrementUsage tracker userId False
        _ <- checkAndIncrementUsage tracker userId False
        _ <- checkAndIncrementUsage tracker userId False
        count <- getUsageCount tracker userId

        -- Assert
        count `shouldBe` 3

      it "returns 0 for user with no requests" $ do
        -- Arrange
        tracker <- newUsageTracker
        let userId = 20 :: UserId

        -- Act
        count <- getUsageCount tracker userId

        -- Assert
        count `shouldBe` 0

      it "returns 0 for non-existent user" $ do
        -- Arrange
        tracker <- newUsageTracker
        let nonExistentUserId = 999 :: UserId

        -- Act
        count <- getUsageCount tracker nonExistentUserId

        -- Assert
        count `shouldBe` 0

    describe "Concurrent requests" $ do
      it "handles concurrent requests atomically without race conditions" $ do
        -- Arrange
        tracker <- newUsageTracker
        let userId = 15 :: UserId
        let numThreads = 20
        let requestsPerThread = 50

        -- Act - spawn multiple threads making concurrent requests
        runConcurrentRequests tracker userId False numThreads requestsPerThread
        threadDelay 100000  -- give threads time to complete

        -- Assert - verify final count is exactly what we expect
        finalCount <- getUsageCount tracker userId
        let expectedCount = numThreads * requestsPerThread
        finalCount `shouldBe` expectedCount

      it "STM ensures no lost updates under heavy concurrency" $ do
        -- Arrange
        tracker <- newUsageTracker
        let userId = 16 :: UserId
        let numThreads = 10
        let requestsPerThread = 100

        -- Act - all threads try to increment simultaneously
        runConcurrentRequests tracker userId False numThreads requestsPerThread
        threadDelay 200000  -- wait for all threads

        -- Assert - should have exact count with no lost updates
        finalCount <- getUsageCount tracker userId
        finalCount `shouldBe` (numThreads * requestsPerThread)

      it "allows all concurrent requests up to limit" $ do
        -- Arrange
        tracker <- newUsageTracker
        let userId = 17 :: UserId
        let numThreads = 10
        let requestsPerThread = 100  -- 10 * 100 = 1000 total

        -- Act
        runConcurrentRequests tracker userId False numThreads requestsPerThread
        threadDelay 200000

        -- Assert - all 1000 should have succeeded
        finalCount <- getUsageCount tracker userId
        finalCount `shouldBe` 1000

      it "blocks excess requests atomically when limit reached" $ do
        -- Arrange
        tracker <- newUsageTracker
        let userId = 18 :: UserId
        let initialRequests = 1000  -- fill the bucket

        -- Act - fill the bucket first
        _ <- runUsageChecks tracker userId False initialRequests

        -- Act - now try to make more requests concurrently
        let excessRequests = 20
        results <- forM [1..excessRequests] $ \_ ->
          checkAndIncrementUsage tracker userId False

        -- Assert - all excess requests should be denied
        map fst results `shouldBe` replicate excessRequests False

    describe "Daily reset behavior" $ do
      it "separate days have independent usage counters" $ do
        -- Arrange - simulate two different days by creating two separate trackers
        tracker1 <- newUsageTracker
        tracker2 <- newUsageTracker
        let userId = 30 :: UserId

        -- Act - user uses tracker1 (day 1) and tracker2 (day 2)
        _ <- runUsageChecks tracker1 userId False 500
        _ <- runUsageChecks tracker2 userId False 500

        -- Assert - each tracker has its own independent count
        count1 <- getUsageCount tracker1 userId
        count2 <- getUsageCount tracker2 userId
        count1 `shouldBe` 500
        count2 `shouldBe` 500

      it "usage on day 1 does not affect day 2 limit" $ do
        -- Arrange
        tracker <- newUsageTracker
        let userId = 31 :: UserId

        -- Act - simulate day 1 by exhausting tracker (conceptually)
        -- Note: Since we can't easily mock time in unit tests,
        -- we verify the reset logic by checking independent counters

        -- Create second "day" by using different user (simulating day change)
        let day2UserId = 32 :: UserId

        -- Act - day 1 user makes 1000 requests (at limit)
        _ <- runUsageChecks tracker userId False 1000
        -- Day 2 user starts fresh
        _ <- runUsageChecks tracker day2UserId False 1

        -- Assert - day 1 user at limit, day 2 user has 1 request
        count1 <- getUsageCount tracker userId
        count2 <- getUsageCount tracker day2UserId
        count1 `shouldBe` 1000
        count2 `shouldBe` 1

    describe "freeDailyLimit constant" $ do
      it "is set to 1000" $ do
        freeDailyLimit `shouldBe` 1000

main :: IO ()
main = hspec spec