-- | Tests for Infra.HttpClient.Base - Base HTTP client with rate limiting + retry
module Infra.HttpClient.BaseSpec where

import Test.Hspec
import Network.HTTP.Client (HttpException(..), ResponseTimeout(..), ConnectionError(..))
import Network.HTTP.Types (Status(..), statusCode)
import Control.Concurrent.STM (TVar, atomically, newTVarIO, readTVarIO, modifyTVar')
import Control.Exception (throwIO)
import Data.ByteString (ByteString)
import Data.Monoid (mempty)
import Infra.HttpClient.Base
import Infra.RateLimit (newRateLimiter)

main :: IO ()
main = hspec spec

spec :: Spec
spec = do
  describe "HttpClientConfig" $ do
    describe "defaultHttpClientConfig" $ do
      it "has sensible defaults" $ do
        hccMaxRetries defaultHttpClientConfig `shouldBe` 3
        hccBaseDelay defaultHttpClientConfig `shouldBe` 100000  -- 100ms
        hccMaxDelay defaultHttpClientConfig `shouldBe` 10000000  -- 10s
        hccJitter defaultHttpClientConfig `shouldBe` 0.1
        hccTimeout defaultHttpClientConfig `shouldBe` 30000000  -- 30s

  describe "HttpClient" $ do
    describe "creation" $ do
      it "creates HttpClient with valid config" $ do
        limiter <- newRateLimiter 10 10
        let config = defaultHttpClientConfig
        client <- buildHttpClient config limiter
        client `shouldSatisfy` (\c -> httpClientManager c /= nullManager)
        -- Note: nullManager check depends on implementation

      it "creates HttpClient with custom retry config" $ do
        limiter <- newRateLimiter 10 10
        let config = defaultHttpClientConfig
              { hccMaxRetries = 5
              , hccBaseDelay = 50000
              }
        client <- buildHttpClient config limiter
        client `shouldSatisfy` (\c -> httpClientConfig c == config)

  describe "isRetryableException" $ do
    it "returns True for HTTP 500" $ do
      isRetryableException (StatusCodeException (Status 500 "Internal Server Error") [] mempty)
        `shouldBe` True

    it "returns True for HTTP 502" $ do
      isRetryableException (StatusCodeException (Status 502 "Bad Gateway") [] mempty)
        `shouldBe` True

    it "returns True for HTTP 503" $ do
      isRetryableException (StatusCodeException (Status 503 "Service Unavailable") [] mempty)
        `shouldBe` True

    it "returns False for HTTP 400" $ do
      isRetryableException (StatusCodeException (Status 400 "Bad Request") [] mempty)
        `shouldBe` False

    it "returns False for HTTP 404" $ do
      isRetryableException (StatusCodeException (Status 404 "Not Found") [] mempty)
        `shouldBe` False

    it "returns True for ResponseTimeout" $ do
      isRetryableException ResponseTimeout `shouldBe` True

    it "returns True for ConnectionError" $ do
      isRetryableException (ConnectionError "connect: failed") `shouldBe` True

  describe "applyRateLimiting" $ do
    it "acquires token when available" $ do
      limiter <- newRateLimiter 10 10
      result <- applyRateLimiting limiter
      result `shouldBe` True

    it "blocks when rate limited" $ do
      -- Create limiter with capacity 0
      limiter <- newRateLimiter 10 0
      result <- applyRateLimiting limiter
      result `shouldBe` False

  describe "withRetry" $ do
    it "succeeds on first attempt" $ do
      limiter <- newRateLimiter 10 10
      let config = defaultHttpClientConfig { hccMaxRetries = 3 }
      result <- withRetry config limiter (return "success")
      result `shouldBe` Right "success"

    it "retries on retryable error" $ do
      limiter <- newRateLimiter 10 10
      let config = defaultHttpClientConfig
            { hccMaxRetries = 2
            , hccBaseDelay = 10000  -- 10ms for fast tests
            }
      counter <- newCounter 0
      result <- withRetry config limiter $ do
        increment counter
        val <- readCounter counter
        if val < 2
          then throwIO (ConnectionError "temporary failure")
          else return "success"
      result `shouldBe` Right "success"

    it "fails after max retries exceeded" $ do
      limiter <- newRateLimiter 10 10
      let config = defaultHttpClientConfig
            { hccMaxRetries = 2
            , hccBaseDelay = 1000  -- 1ms for fast tests
            }
      result <- withRetry config limiter (throwIO $ ConnectionError "permanent failure")
      result `shouldSatisfy` isLeft

  describe "httpClientConfigValid" $ do
    it "returns True for valid config" $ do
      httpClientConfigValid defaultHttpClientConfig `shouldBe` True

    it "returns False for negative maxRetries" $ do
      let config = defaultHttpClientConfig { hccMaxRetries = -1 }
      httpClientConfigValid config `shouldBe` False

    it "returns False for negative timeout" $ do
      let config = defaultHttpClientConfig { hccTimeout = -1 }
      httpClientConfigValid config `shouldBe` False

-- Helper for counter-based tests
newCounter :: Int -> IO (TVar Int)
newCounter = newTVarIO

readCounter :: TVar Int -> IO Int
readCounter = readTVarIO

increment :: TVar Int -> IO ()
increment var = atomically $ modifyTVar' var (+ 1)

nullManager :: Network.HTTP.Client.Manager
nullManager = error "nullManager used in test"

isLeft :: Either a b -> Bool
isLeft (Left _) = True
isLeft _ = False
