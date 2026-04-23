-- Database Schema - Persistent entity definitions
-- Uses Template Haskell for SQL table generation
module Database.Schema where

-- Required Language Extensions for Persistent
{-# LANGUAGE EmptyDataDecls             #-}
{-# LANGUAGE FlexibleContexts           #-}
{-# LANGUAGE GADTs                      #-}
{-# LANGUAGE GeneralizedNewtypeDeriving #-}
{-# LANGUAGE MultiParamTypeClasses      #-}
{-# LANGUAGE OverloadedStrings          #-}
{-# LANGUAGE QuasiQuotes                #-}
{-# LANGUAGE TemplateHaskell            #-}
{-# LANGUAGE TypeFamilies               #-}

import Database.Persist
import Database.Persist.Sqlite
import Database.Persist.TH
import Data.Text (Text)
import Data.Time (UTCTime)

-- | Subscription plan types
data Plan = Free | Paid
    deriving (Show, Eq, Read)

-- | Marketplace types
data Marketplace = WB | Ozon
    deriving (Show, Eq, Read)

-- | Persistent entity definitions with TH
-- Uses sqlSettings for SQLite backend and mkMigrate for migrations
share [mkPersist sqlSettings, mkMigrate "migrateSchema"] [persistLowerCase|

    -- User account with subscription reference
    User
        email           Text
        passwordHash    Text
        apiKey          Text
        subscriptionId  SubscriptionId Maybe
        createdAt       UTCTime
        deriving Show

    -- Subscription plan for users
    Subscription
        plan        Plan
        expiresAt   UTCTime
        maxApiCalls Int
        deriving Show

    -- Product listing on a marketplace
    Product
        userId          UserId
        marketplace     Marketplace
        externalId      Text
        name            Text
        cost            Double
        price           Double
        createdAt       UTCTime
        deriving Show

    -- Price history tracking for products
    PriceHistory
        productId   ProductId
        price       Double
        recordedAt  UTCTime
        deriving Show

    -- Competitor pricing data
    CompetitorData
        productId       ProductId
        competitorName  Text
        price           Double
        recordedAt      UTCTime
        deriving Show
|]

-- Note: Persistent TH generates the following accessors automatically:
-- User: userId, userEmail, userPasswordHash, userApiKey, userSubscriptionId, userCreatedAt
-- Subscription: subscriptionId, subscriptionPlan, subscriptionExpiresAt, subscriptionMaxApiCalls
-- Product: productId, productUserId, productMarketplace, productExternalId, productName, productCost, productPrice, productCreatedAt
-- PriceHistory: priceHistoryId, priceHistoryProductId, priceHistoryPrice, priceHistoryRecordedAt
-- CompetitorData: competitorDataId, competitorDataProductId, competitorDataCompetitorName, competitorDataPrice, competitorDataRecordedAt
