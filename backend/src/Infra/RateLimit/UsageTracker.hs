-- | Infra.RateLimit.UsageTracker - Daily usage tracking per user with STM
module Infra.RateLimit.UsageTracker
    ( DailyUsage(..)
    , UsageTracker(..)
    , newUsageTracker
    , checkAndIncrementUsage
    , getUsageCount
    , freeDailyLimit
    ) where

import Control.Concurrent.STM (TVar, STM, atomically, newTVar, readTVar, writeTVar, modifyTVar')
import Control.Monad (when)
import Data.Map.Strict as Map
import Data.Time (UTCTime, getCurrentTime, utctDay)
import Data.Time.Calendar (toGregorian)
import Auth.JWT (UserId)

-- | Daily usage limit for free tier
freeDailyLimit :: Int
freeDailyLimit = 1000

-- | Daily usage record for a single user
data DailyUsage = DailyUsage
    { duUserId :: UserId
    , duDate :: Int  -- ^ Day as YYYYMMDD integer for easy comparison
    , duCount :: TVar Int
    }

-- | Show instance for DailyUsage (excludes TVar)
instance Show DailyUsage where
    show du = "DailyUsage { duUserId = " ++ show (duUserId du)
           ++ ", duDate = " ++ show (duDate du) ++ " }"

-- | Usage tracker managing all user daily usages
data UsageTracker = UsageTracker
    { utUsage :: TVar (Map UserId DailyUsage)
    }

-- | Show instance for UsageTracker (excludes TVar contents)
instance Show UsageTracker where
    show _ = "UsageTracker { <in-memory> }"

-- | Create a new usage tracker
newUsageTracker :: IO UsageTracker
newUsageTracker = do
    usageVar <- atomically $ newTVar Map.empty
    pure $ UsageTracker { utUsage = usageVar }

-- | Get today's date as integer (YYYYMMDD format)
getTodayInt :: IO Int
getTodayInt = do
    now <- getCurrentTime
    let day = utctDay now
        (year, month, dayOfMonth) = toGregorian day
        yearInt = fromIntegral year :: Int
        monthInt = fromIntegral month :: Int
        dayInt = fromIntegral dayOfMonth :: Int
    pure $ yearInt * 10000 + monthInt * 100 + dayInt

-- | Get or create daily usage for a user (atomic)
getOrCreateDailyUsage :: TVar (Map UserId DailyUsage) -> UserId -> Int -> STM DailyUsage
getOrCreateDailyUsage usageMapVar userId todayInt = do
    usageMap <- readTVar usageMapVar
    case Map.lookup userId usageMap of
        Just du | duDate du == todayInt -> pure du
        _ -> do
            countVar <- newTVar 0
            let newDu = DailyUsage
                    { duUserId = userId
                    , duDate = todayInt
                    , duCount = countVar
                    }
            modifyTVar' usageMapVar $ Map.insert userId newDu
            pure newDu

-- | Check and increment usage for a user
--
-- Returns (isAllowed, currentCount)
-- For Paid users, always allowed
-- For Free users, allowed if count < freeDailyLimit
checkAndIncrementUsage :: UsageTracker -> UserId -> Bool -> IO (Bool, Int)
checkAndIncrementUsage tracker userId isPaid = do
    todayInt <- getTodayInt
    atomically $ do
        usageMap <- readTVar (utUsage tracker)
        -- If Paid user, always allow and don't count
        if isPaid
            then case Map.lookup userId usageMap of
                Just du -> do
                    count <- readTVar (duCount du)
                    pure (True, count)
                Nothing -> pure (True, 0)
            else do
                du <- getOrCreateDailyUsage (utUsage tracker) userId todayInt
                currentCount <- readTVar (duCount du)
                let newCount = currentCount + 1
                let isAllowed = newCount <= freeDailyLimit
                when isAllowed $ writeTVar (duCount du) newCount
                pure (isAllowed, newCount)

-- | Get current usage count for a user
getUsageCount :: UsageTracker -> UserId -> IO Int
getUsageCount tracker userId = do
    todayInt <- getTodayInt
    atomically $ do
        usageMap <- readTVar (utUsage tracker)
        case Map.lookup userId usageMap of
            Just du | duDate du == todayInt -> readTVar (duCount du)
            _ -> pure 0
