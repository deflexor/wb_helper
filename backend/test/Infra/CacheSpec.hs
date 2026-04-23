-- | Tests for Cache infrastructure
module Infra.CacheSpec where

import Test.Hspec
import Data.Time (UTCTime, getCurrentTime, addUTCTime, diffUTCTime)
import Control.Concurrent (threadDelay)
import Control.Concurrent.Async (async, wait)
import Control.Monad (forM_, replicateM)

import Infra.Cache

-- | Helper to get current time plus offset in seconds
futureTime :: Int -> IO UTCTime
futureTime offset = do
  now <- getCurrentTime
  pure $ addUTCTime (fromInteger $ toInteger offset) now

-- | Helper to get time in the past (negative offset)
pastTime :: Int -> IO UTCTime
pastTime offset = futureTime (-offset)

spec :: Spec
spec = do
  describe "Cache" $ do
    describe "cacheGet/cacheSet - basic operations" $ do
      it "returns Nothing for empty cache" $ do
        cache <- newCache
        result <- cacheGet "key" cache
        result `shouldBe` Nothing

      it "returns Just value after setting" $ do
        cache <- newCache
        cacheSet "key" "value" 60 cache
        result <- cacheGet "key" cache
        result `shouldBe` Just "value"

      it "returns value for different keys independently" $ do
        cache <- newCache
        cacheSet "key1" "value1" 60 cache
        cacheSet "key2" "value2" 60 cache
        result1 <- cacheGet "key1" cache
        result2 <- cacheGet "key2" cache
        result1 `shouldBe` Just "value1"
        result2 `shouldBe` Just "value2"

      it "overwrites existing value with new value" $ do
        cache <- newCache
        cacheSet "key" "value1" 60 cache
        cacheSet "key" "value2" 60 cache
        result <- cacheGet "key" cache
        result `shouldBe` Just "value2"

    describe "TTL expiration" $ do
      it "returns Nothing for expired key" $ do
        cache <- newCache
        cacheSet "key" "value" 1 cache  -- 1 second TTL
        threadDelay 2000000  -- wait 2 seconds
        result <- cacheGet "key" cache
        result `shouldBe` Nothing

      it "returns Just value before expiration" $ do
        cache <- newCache
        cacheSet "key" "value" 10 cache  -- 10 second TTL
        threadDelay 500000  -- wait 0.5 seconds
        result <- cacheGet "key" cache
        result `shouldBe` Just "value"

      it "handles zero TTL as immediate expiration" $ do
        cache <- newCache
        cacheSet "key" "value" 0 cache
        result <- cacheGet "key" cache
        result `shouldBe` Nothing

      it "handles negative TTL as immediate expiration" $ do
        cache <- newCache
        cacheSet "key" "value" (-5) cache
        result <- cacheGet "key" cache
        result `shouldBe` Nothing

    describe "cacheInvalidate" $ do
      it "removes key from cache" $ do
        cache <- newCache
        cacheSet "key" "value" 60 cache
        cacheInvalidate "key" cache
        result <- cacheGet "key" cache
        result `shouldBe` Nothing

      it "does not affect other keys" $ do
        cache <- newCache
        cacheSet "key1" "value1" 60 cache
        cacheSet "key2" "value2" 60 cache
        cacheInvalidate "key1" cache
        result1 <- cacheGet "key1" cache
        result2 <- cacheGet "key2" cache
        result1 `shouldBe` Nothing
        result2 `shouldBe` Just "value2"

      it "is safe to invalidate non-existent key" $ do
        cache <- newCache
        cacheInvalidate "nonexistent" cache
        result <- cacheGet "nonexistent" cache
        result `shouldBe` Nothing

    describe "cacheClear" $ do
      it "removes all keys from cache" $ do
        cache <- newCache
        cacheSet "key1" "value1" 60 cache
        cacheSet "key2" "value2" 60 cache
        cacheSet "key3" "value3" 60 cache
        cacheClear cache
        result1 <- cacheGet "key1" cache
        result2 <- cacheGet "key2" cache
        result3 <- cacheGet "key3" cache
        result1 `shouldBe` Nothing
        result2 `shouldBe` Nothing
        result3 `shouldBe` Nothing

      it "is safe to clear empty cache" $ do
        cache <- newCache
        cacheClear cache
        result <- cacheGet "any" cache
        result `shouldBe` Nothing

    describe "thread safety" $ do
      it "handles concurrent reads safely" $ do
        cache <- newCache
        cacheSet "key" "value" 60 cache
        let doGet = cacheGet "key" cache
        results <- forM_ [1..100] $ \_ -> async doGet
        vals <- waitAll results
        -- All reads should return Just "value"
        vals `shouldBe` replicate 100 (Just "value")

      it "handles concurrent writes safely" $ do
        cache <- newCache
        let doSet i = cacheSet "key" i 60 cache
        forM_ [1..100] $ \i -> async (doSet i)
        threadDelay 100000
        result <- cacheGet "key" cache
        -- Should have some value (deterministic not required)
        result `shouldSatisfy` (/= Nothing)

      it "handles concurrent read/write safely" $ do
        cache <- newCache
        cacheSet "key" "initial" 60 cache
        -- Start multiple readers and writers
        let doRead = cacheGet "key" cache
        let doWrite i = cacheSet "key" i 60 cache
        -- 50 readers
        readers <- forM_ [1..50] $ \_ -> async doRead
        -- 50 writers
        forM_ [1..50] $ \i -> async (doWrite i)
        -- Wait for all to complete
        readResults <- waitAll readers
        -- No reader should throw an exception (thread safety check)
        length readResults `shouldBe` 50

      it "maintains consistency under concurrent load" $ do
        cache <- newCache
        -- Many concurrent operations
        forM_ [1..100] $ \i -> async $ cacheSet ("key" <> show i) ("value" <> show i) 60 cache
        threadDelay 200000
        -- Verify multiple keys are present
        result1 <- cacheGet "key1" cache
        result50 <- cacheGet "key50" cache
        result100 <- cacheGet "key100" cache
        result1 `shouldBe` Just "value1"
        result50 `shouldBe` Just "value50"
        result100 `shouldBe` Just "value100"

    describe "Cache structure" $ do
      it "CachedValue stores value and expiration" $ do
        cache <- newCache
        now <- getCurrentTime
        let expiresAt = addUTCTime 60 now
        cacheSetWithExpiry "key" "value" expiresAt cache
        result <- cacheGet "key" cache
        result `shouldBe` Just "value"

      it "does not return expired value even with manual expiry" $ do
        cache <- newCache
        now <- getCurrentTime
        let pastExpiry = addUTCTime (-10) now
        cacheSetWithExpiry "key" "value" pastExpiry cache
        result <- cacheGet "key" cache
        result `shouldBe` Nothing

waitAll :: [IO a] -> IO [a]
waitAll = sequence

main :: IO ()
main = hspec spec
