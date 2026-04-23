-- | Tests for Infra.Retry - Retry logic with exponential backoff
module Infra.RetrySpec where

import Test.Hspec
import Infra.Retry
import Network.HTTP.Client (HttpException(..), ResponseTimeout(..), StatusCodeException(..))
import Network.HTTP.Types (Status(..))

main :: IO ()
main = hspec spec

spec :: Spec
spec = do
  describe "RetryConfig" $ do
    describe "defaultRetryConfig" $ do
      it "has sensible defaults" $ do
        rcMaxRetries defaultRetryConfig `shouldBe` 3
        rcBaseDelay defaultRetryConfig `shouldBe` 100000  -- 100ms in microseconds
        rcMaxDelay defaultRetryConfig `shouldBe` 10000000  -- 10s in microseconds
        rcJitter defaultRetryConfig `shouldBe` 0.1

  describe "calculateDelays" $ do
    it "returns empty list when maxRetries is 0" $ do
      let config = defaultRetryConfig { rcMaxRetries = 0 }
      calculateDelays config `shouldBe` []

    it "returns single delay when maxRetries is 1" $ do
      let config = defaultRetryConfig { rcMaxRetries = 1, rcBaseDelay = 100000 }
      calculateDelays config `shouldBe` [100000]

    it "returns exponential delays capped at maxDelay" $ do
      let config = defaultRetryConfig
            { rcMaxRetries = 5
            , rcBaseDelay = 100000  -- 100ms
            , rcMaxDelay = 1000000  -- 1s
            }
      calculateDelays config `shouldBe` [100000, 200000, 400000, 800000, 1000000]

    it "returns delays bounded by maxDelay" $ do
      let config = defaultRetryConfig
            { rcMaxRetries = 10
            , rcBaseDelay = 1000000  -- 1s
            , rcMaxDelay = 5000000   -- 5s
            }
      calculateDelays config `shouldBe` [1000000, 2000000, 4000000, 5000000, 5000000, 5000000, 5000000, 5000000, 5000000, 5000000]

    it "returns empty list for negative maxRetries" $ do
      let config = defaultRetryConfig { rcMaxRetries = -1 }
      calculateDelays config `shouldBe` []

    it "handles zero base delay" $ do
      let config = defaultRetryConfig { rcMaxRetries = 3, rcBaseDelay = 0 }
      calculateDelays config `shouldBe` [0, 0, 0]

    it "handles zero max delay" $ do
      let config = defaultRetryConfig { rcMaxRetries = 3, rcBaseDelay = 100000, rcMaxDelay = 0 }
      calculateDelays config `shouldBe` [0, 0, 0]

  describe "isRetryable" $ do
    it "returns True for HTTP 500" $ do
      isRetryable (StatusCodeException (Status 500 "Internal Server Error") [] mempty)
        `shouldBe` True

    it "returns True for HTTP 502" $ do
      isRetryable (StatusCodeException (Status 502 "Bad Gateway") [] mempty)
        `shouldBe` True

    it "returns True for HTTP 503" $ do
      isRetryable (StatusCodeException (Status 503 "Service Unavailable") [] mempty)
        `shouldBe` True

    it "returns False for HTTP 400" $ do
      isRetryable (StatusCodeException (Status 400 "Bad Request") [] mempty)
        `shouldBe` False

    it "returns False for HTTP 404" $ do
      isRetryable (StatusCodeException (Status 404 "Not Found") [] mempty)
        `shouldBe` False

    it "returns True for ResponseTimeout" $ do
      isRetryable ResponseTimeout `shouldBe` True

    it "returns True for ConnectionError" $ do
      isRetryable (ConnectionError "connect: failed") `shouldBe` True

    it "returns True for InvalidStatusCode" $ do
      isRetryable (InvalidStatusCode 0) `shouldBe` True

  describe "retryConfigValid" $ do
    it "returns True for valid config" $ do
      retryConfigValid defaultRetryConfig `shouldBe` True

    it "returns False for negative maxRetries" $ do
      let config = defaultRetryConfig { rcMaxRetries = -1 }
      retryConfigValid config `shouldBe` False

    it "returns False for jitter below 0" $ do
      let config = defaultRetryConfig { rcJitter = -0.1 }
      retryConfigValid config `shouldBe` False

    it "returns False for jitter above 1" $ do
      let config = defaultRetryConfig { rcJitter = 1.5 }
      retryConfigValid config `shouldBe` False

    it "returns False for negative baseDelay" $ do
      let config = defaultRetryConfig { rcBaseDelay = -1 }
      retryConfigValid config `shouldBe` False

    it "returns False for negative maxDelay" $ do
      let config = defaultRetryConfig { rcMaxDelay = -1 }
      retryConfigValid config `shouldBe` False
