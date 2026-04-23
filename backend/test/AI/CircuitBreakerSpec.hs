-- | Tests for AI.CircuitBreaker - Circuit breaker state machine
module AI.CircuitBreakerSpec where

import Test.Hspec
import Data.Time (UTCTime, addUTCTime, getCurrentTime)
import Control.Concurrent (threadDelay)
import Control.Concurrent.STM

import AI.CircuitBreaker

main :: IO ()
main = hspec spec

-- | Helper to create default config for testing
defaultCBConfig :: CircuitBreakerConfig
defaultCBConfig = CircuitBreakerConfig
  { cbFailureThreshold = 5
  , cbRecoveryTimeout = 60
  , cbHalfOpenRequests = 3
  }

-- | Helper to create a circuit breaker with default config
newTestCircuitBreaker :: IO CircuitBreaker
newTestCircuitBreaker = newCircuitBreaker defaultCBConfig

spec :: Spec
spec = do
  describe "CircuitState" $ do
    it "has Show instance" $ do
      show Closed `shouldBe` "Closed"
      show Open `shouldBe` "Open"
      show HalfOpen `shouldBe` "HalfOpen"

    it "has Eq instance" $ do
      Closed `shouldBe` Closed
      Open `shouldBe` Open
      HalfOpen `shouldBe` HalfOpen
      Closed `shouldNotBe` Open

  describe "CircuitBreakerConfig" $ do
    it "has Show instance" $ do
      show defaultCBConfig `shouldContain` "CircuitBreakerConfig"

    it "default config has expected values" $ do
      cbFailureThreshold defaultCBConfig `shouldBe` 5
      cbRecoveryTimeout defaultCBConfig `shouldBe` 60
      cbHalfOpenRequests defaultCBConfig `shouldBe` 3

  describe "newCircuitBreaker" $ do
    it "creates circuit breaker in Closed state" $ do
      cb <- newTestCircuitBreaker
      state <- atomically $ readTVar (cbState cb)
      state `shouldBe` Closed

    it "initializes failure count to 0" $ do
      cb <- newTestCircuitBreaker
      count <- atomically $ readTVar (cbFailureCount cb)
      count `shouldBe` 0

    it "initializes success count to 0" $ do
      cb <- newTestCircuitBreaker
      count <- atomically $ readTVar (cbSuccessCount cb)
      count `shouldBe` 0

  describe "getState" $ do
    it "returns current circuit state" $ do
      cb <- newTestCircuitBreaker
      state <- getState cb
      state `shouldBe` Closed

  describe "canExecute" $ do
    it "returns True in Closed state" $ do
      cb <- newTestCircuitBreaker
      result <- canExecute cb
      result `shouldBe` True

    it "returns True in HalfOpen state" $ do
      cb <- newTestCircuitBreaker
      -- Transition to HalfOpen by failing enough times and waiting
      mapM_ (\_ -> recordFailure cb) [1..5]
      threadDelay (61 * 1000000) -- Wait for recovery timeout
      result <- canExecute cb
      result `shouldBe` True

    it "returns False in Open state immediately" $ do
      cb <- newTestCircuitBreaker
      -- Open the circuit by recording 5 failures
      mapM_ (\_ -> recordFailure cb) [1..5]
      result <- canExecute cb
      result `shouldBe` False

  describe "recordSuccess" $ do
    it "increments success count" $ do
      cb <- newTestCircuitBreaker
      recordSuccess cb
      count <- atomically $ readTVar (cbSuccessCount cb)
      count `shouldBe` 1

    it "resets failure count" $ do
      cb <- newTestCircuitBreaker
      recordFailure cb
      recordFailure cb
      recordSuccess cb
      count <- atomically $ readTVar (cbFailureCount cb)
      count `shouldBe` 0

    it "transitions from HalfOpen to Closed after enough successes" $ do
      cb <- newTestCircuitBreaker
      -- Open the circuit
      mapM_ (\_ -> recordFailure cb) [1..5]
      -- Wait for recovery timeout
      threadDelay (61 * 1000000)
      -- Record 3 successes in half-open
      recordSuccess cb
      recordSuccess cb
      recordSuccess cb
      state <- getState cb
      state `shouldBe` Closed

  describe "recordFailure" $ do
    it "increments failure count" $ do
      cb <- newTestCircuitBreaker
      recordFailure cb
      count <- atomically $ readTVar (cbFailureCount cb)
      count `shouldBe` 1

    it "opens circuit after failureThreshold failures" $ do
      cb <- newTestCircuitBreaker
      mapM_ (\_ -> recordFailure cb) [1..5]
      state <- getState cb
      state `shouldBe` Open

    it "resets success count" $ do
      cb <- newTestCircuitBreaker
      recordSuccess cb
      recordSuccess cb
      recordFailure cb
      count <- atomically $ readTVar (cbSuccessCount cb)
      count `shouldBe` 0

    it "records last failure time" $ do
      cb <- newTestCircuitBreaker
      before <- getCurrentTime
      recordFailure cb
      after <- atomically $ readTVar (cbLastFailure cb)
      diffUTCTime after before `shouldSatisfy` (\d -> d >= 0 && d < 1)

  describe "State Transitions" $ do
    it "CLOSED -> OPEN: After failureThreshold consecutive failures" $ do
      cb <- newTestCircuitBreaker
      mapM_ (\_ -> recordFailure cb) [1..5]
      state <- getState cb
      state `shouldBe` Open

    it "OPEN -> HALF_OPEN: After recoveryTimeout seconds" $ do
      cb <- newTestCircuitBreaker
      mapM_ (\_ -> recordFailure cb) [1..5]
      -- Wait slightly longer than recovery timeout
      threadDelay (61 * 1000000)
      state <- getState cb
      state `shouldBe` HalfOpen

    it "HALF_OPEN -> CLOSED: After halfOpenRequests successful requests" $ do
      cb <- newTestCircuitBreaker
      mapM_ (\_ -> recordFailure cb) [1..5]
      threadDelay (61 * 1000000) -- Transition to half-open
      -- Record 3 successes
      recordSuccess cb
      recordSuccess cb
      recordSuccess cb
      state <- getState cb
      state `shouldBe` Closed

    it "HALF_OPEN -> OPEN: On any failure in half-open state" $ do
      cb <- newTestCircuitBreaker
      mapM_ (\_ -> recordFailure cb) [1..5]
      threadDelay (61 * 1000000) -- Transition to half-open
      recordFailure cb
      state <- getState cb
      state `shouldBe` Open

  describe "Reset behavior" $ do
    it "success in Closed state resets failure count" $ do
      cb <- newTestCircuitBreaker
      recordFailure cb
      recordFailure cb
      recordFailure cb
      recordSuccess cb
      count <- atomically $ readTVar (cbFailureCount cb)
      count `shouldBe` 0

    it "failure in Closed state does not reset success count" $ do
      cb <- newTestCircuitBreaker
      recordSuccess cb
      recordSuccess cb
      recordFailure cb
      count <- atomically $ readTVar (cbSuccessCount cb)
      count `shouldBe` 0