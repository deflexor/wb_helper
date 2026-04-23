-- | Circuit Breaker state machine for AI Orchestration Layer
module AI.CircuitBreaker
  ( CircuitState(..)
  , CircuitBreakerConfig(..)
  , CircuitBreaker(..)
  , newCircuitBreaker
  , getState
  , canExecute
  , recordSuccess
  , recordFailure
  , defaultCircuitBreakerConfig
  ) where

import Control.Concurrent.STM
import Data.Time (UTCTime, getCurrentTime, diffUTCTime)

-- | Circuit breaker states
data CircuitState
    = Closed   -- ^ Normal operation, requests allowed
    | Open     -- ^ Too many failures, requests rejected
    | HalfOpen -- ^ Testing if service recovered
    deriving (Show, Eq)

-- | Circuit breaker configuration
data CircuitBreakerConfig = CircuitBreakerConfig
  { cbFailureThreshold :: Int  -- ^ Failures before opening (default: 5)
  , cbRecoveryTimeout  :: Int  -- ^ Seconds before half-open (default: 60)
  , cbHalfOpenRequests :: Int  -- ^ Max test requests in half-open (default: 3)
  } deriving (Show, Eq)

-- | Default circuit breaker configuration
defaultCircuitBreakerConfig :: CircuitBreakerConfig
defaultCircuitBreakerConfig = CircuitBreakerConfig
  { cbFailureThreshold = 5
  , cbRecoveryTimeout = 60
  , cbHalfOpenRequests = 3
  }

-- | Circuit breaker state machine
data CircuitBreaker = CircuitBreaker
  { cbState        :: TVar CircuitState
  , cbConfig       :: CircuitBreakerConfig
  , cbFailureCount :: TVar Int
  , cbSuccessCount :: TVar Int
  , cbLastFailure  :: TVar UTCTime
  } deriving (Eq)

-- | Create a new circuit breaker with default configuration
newCircuitBreaker :: CircuitBreakerConfig -> IO CircuitBreaker
newCircuitBreaker config = do
  now <- getCurrentTime
  atomically $ do
    state <- newTVar Closed
    failureCount <- newTVar 0
    successCount <- newTVar 0
    lastFailure <- newTVar now
    pure CircuitBreaker
      { cbState = state
      , cbConfig = config
      , cbFailureCount = failureCount
      , cbSuccessCount = successCount
      , cbLastFailure = lastFailure
      }

-- | Get current circuit state
getState :: CircuitBreaker -> IO CircuitState
getState cb = atomically $ readTVar (cbState cb)

-- | Check if a request can be executed
canExecute :: CircuitBreaker -> IO Bool
canExecute cb = do
  state <- atomically $ readTVar (cbState cb)
  case state of
    Closed -> pure True
    HalfOpen -> pure True
    Open -> do
      -- Check if recovery timeout has passed
      lastFailureTime <- atomically $ readTVar (cbLastFailure cb)
      now <- getCurrentTime
      let elapsed = diffUTCTime now lastFailureTime
      if elapsed >= fromIntegral (cbRecoveryTimeout (cbConfig cb))
        then do
          -- Transition to HalfOpen
          atomically $ do
            writeTVar (cbState cb) HalfOpen
            writeTVar (cbFailureCount cb) 0
          pure True
        else pure False

-- | Record a successful request
recordSuccess :: CircuitBreaker -> IO ()
recordSuccess cb = atomically $ do
  state <- readTVar (cbState cb)
  case state of
    Closed -> do
      -- Reset failure count on success
      writeTVar (cbFailureCount cb) 0
      writeTVar (cbSuccessCount cb) 0
    HalfOpen -> do
      successCount <- readTVar (cbSuccessCount cb)
      let newCount = successCount + 1
      if newCount >= cbHalfOpenRequests (cbConfig cb)
        then do
          -- Transition to Closed
          writeTVar (cbState cb) Closed
          writeTVar (cbSuccessCount cb) 0
          writeTVar (cbFailureCount cb) 0
        else
          writeTVar (cbSuccessCount cb) newCount
    Open -> pure ()

-- | Record a failed request
recordFailure :: CircuitBreaker -> IO ()
recordFailure cb = do
  now <- getCurrentTime
  atomically $ do
    state <- readTVar (cbState cb)
    case state of
      Closed -> do
        failureCount <- readTVar (cbFailureCount cb)
        let newCount = failureCount + 1
        writeTVar (cbFailureCount cb) newCount
        writeTVar (cbLastFailure cb) now
        if newCount >= cbFailureThreshold (cbConfig cb)
          then writeTVar (cbState cb) Open
          else pure ()
      HalfOpen -> do
        -- Any failure in half-open transitions to Open
        writeTVar (cbState cb) Open
        writeTVar (cbLastFailure cb) now
      Open -> do
        -- Update last failure time but stay open
        writeTVar (cbLastFailure cb) now