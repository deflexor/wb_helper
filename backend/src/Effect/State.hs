-- | State effect utilities for application state management
module Effect.State
  ( module Effectful.State.Static.Local
  , AppState(..)
  , emptyAppState
  , modifyAppCache
  , modifyAppRateLimiters
  ) where

import Effectful
import Effectful.State.Static.Local
import Data.Map as Map
import Data.Text as Text
import Config (Config(..))

-- | Cached value with expiration
data CachedValue = CachedValue
  { cachedValue :: Text
  , cachedExpiry :: Int
  } deriving (Show, Eq)

-- | Rate limiter state
data RateLimiter = RateLimiter
  { rateLimitTokens :: Int
  , rateLimitLastRefill :: Int
  } deriving (Show, Eq)

-- | Application state for in-memory caches and rate limiting
data AppState = AppState
  { appCache :: !(Map Text CachedValue)
  , appRateLimiters :: !(Map Text RateLimiter)
  , appConfig :: !Config
  } deriving (Show, Eq)

-- | Create an empty application state
emptyAppState :: Config -> AppState
emptyAppState cfg = AppState
  { appCache = Map.empty
  , appRateLimiters = Map.empty
  , appConfig = cfg
  }

-- | Modify the cache in app state
modifyAppCache :: State AppState :> es => (Map Text CachedValue -> Map Text CachedValue) -> Eff es ()
modifyAppCache f = modify $ \s -> s { appCache = f (appCache s) }

-- | Modify the rate limiters in app state
modifyAppRateLimiters :: State AppState :> es => (Map Text RateLimiter -> Map Text RateLimiter) -> Eff es ()
modifyAppRateLimiters f = modify $ \s -> s { appRateLimiters = f (appRateLimiters s) }