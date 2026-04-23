-- | In-memory caching infrastructure with TTL support
module Infra.Cache
  ( Cache
  , CachedValue(..)
  , newCache
  , cacheGet
  , cacheSet
  , cacheSetWithExpiry
  , cacheInvalidate
  , cacheClear
  ) where

import Control.Concurrent.STM (TVar, atomically, newTVar, readTVar, writeTVar, modifyTVar')
import Data.Time (UTCTime, getCurrentTime, addUTCTime, diffUTCTime)
import Data.Text (Text)
import Data.Map as Map

-- | A cached value with expiration time
data CachedValue a = CachedValue
  { cvValue :: a
  , cvExpiresAt :: UTCTime
  } deriving (Show, Eq)

-- | An in-memory cache with TTL support
-- The TVar contains a Map from cache key to CachedValue
newtype Cache a = Cache (TVar (Map Text (CachedValue a)))

-- | Create a new empty cache
newCache :: IO (Cache a)
newCache = Cache <$> atomically (Map.empty >>= newTVar)

-- | Get a value from the cache
--
-- Returns Nothing if the key is missing or if the cached value has expired.
-- This function is thread-safe.
cacheGet :: Text -> Cache a -> IO (Maybe a)
cacheGet key (Cache tvar) = do
  now <- getCurrentTime
  atomically $ do
    m <- readTVar tvar
    case Map.lookup key m of
      Nothing -> pure Nothing
      Just cv
        | cvExpiresAt cv `diffUTCTime` now > 0 -> do
            -- Expired: remove and return Nothing
            writeTVar tvar (Map.delete key m)
            pure Nothing
        | otherwise -> pure (Just (cvValue cv))

-- | Set a value in the cache with TTL (time-to-live) in seconds
--
-- If TTL is <= 0, the value is set to expire immediately.
-- This function is thread-safe.
cacheSet :: Text -> a -> Int -> Cache a -> IO ()
cacheSet key value ttl (Cache tvar) = do
  now <- getCurrentTime
  let expiresAt = addUTCTime (fromInteger $ toInteger ttl) now
  atomically $ modifyTVar' tvar $ \m ->
    Map.insert key (CachedValue value expiresAt) m

-- | Set a value in the cache with explicit expiration time
--
-- This is useful for scenarios where the expiration time is known
-- (e.g., when syncing with an external cache that has its own expiry).
-- This function is thread-safe.
cacheSetWithExpiry :: Text -> a -> UTCTime -> Cache a -> IO ()
cacheSetWithExpiry key value expiresAt (Cache tvar) =
  atomically $ modifyTVar' tvar $ \m ->
    Map.insert key (CachedValue value expiresAt) m

-- | Invalidate (remove) a key from the cache
--
-- This is safe to call on non-existent keys.
-- This function is thread-safe.
cacheInvalidate :: Text -> Cache a -> IO ()
cacheInvalidate key (Cache tvar) =
  atomically $ modifyTVar' tvar $ Map.delete key

-- | Clear all entries from the cache
--
-- This function is thread-safe.
cacheClear :: Cache a -> IO ()
cacheClear (Cache tvar) =
  atomically $ writeTVar tvar Map.empty
