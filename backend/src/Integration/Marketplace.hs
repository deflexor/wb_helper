-- | Marketplace Integration - Unified interface for WB and Ozon operations
{-# LANGUAGE OverloadedStrings #-}
module Integration.Marketplace
    ( -- * Marketplace clients
      MarketplaceClient(..)
    , WBMarketplaceClient(..)
    , OzonMarketplaceClient(..)

      -- * Integration operations
    , fetchAllProducts
    , syncProductPrices
    , analyzeProductMargins
    , compareMarketplacePrices

      -- * Client management
    , buildMarketplaceClient
    , withMarketplaceClients
    ) where

import Control.Monad (forM, when)
import Data.Aeson (encode, decode, Value, object, (.=))
import Data.Text (Text)
import qualified Data.Text as T
import Data.Time (UTCTime, getCurrentTime)
import GHC.Generics (Generic)

import Effect.AppEffect
import Effect.Error
import Database.Schema (Marketplace(..))
import Auth.JWT (Plan(..), UserId)
import Api.WB.Client (WBClient, getProducts, updatePrice)
import Api.Ozon.Client (OzonClient, getProducts, updatePrices)
import Domain.Margin (calcMargin, calcRequiredPrice)
import Domain.PriceAnalysis (calcPriceGap, calcGapPercentage, recommendPrice, PriceRecommendation(..))

-- =============================================================================
-- Marketplace Client Types
-- =============================================================================

-- | Unified marketplace client that wraps WB and Ozon clients
data MarketplaceClient = MarketplaceClient
    { mcWBClient :: Maybe WBClient
    , mcOzonClient :: Maybe OzonClient
    , mcUserId :: UserId
    }

-- | WB-specific integration client
newtype WBMarketplaceClient = WBMarketplaceClient WBClient

-- | Ozon-specific integration client
newtype OzonMarketplaceClient = OzonMarketplaceClient OzonClient

-- =============================================================================
-- Product Types
-- =============================================================================

-- | Unified product representation across marketplaces
data MarketplaceProduct = MarketplaceProduct
    { mpId :: Int
    , mpUserId :: UserId
    , mpMarketplace :: Marketplace
    , mpExternalId :: Text
    , mpName :: Text
    , mpCost :: Double
    , mpPrice :: Double
    , mpCompetitorPrice :: Maybe Double
    , mpLastUpdated :: UTCTime
    } deriving (Show, Eq, Generic)

-- | Price update result
data PriceUpdateResult = PriceUpdateResult
    { purSuccess :: Bool
    , purProductId :: Int
    , purOldPrice :: Double
    , purNewPrice :: Double
    , purMarketplace :: Marketplace
    , purError :: Maybe Text
    } deriving (Show, Eq)

-- | Margin analysis result
data MarginAnalysis = MarginAnalysis
    { maProductId :: Int
    , maCost :: Double
    , maPrice :: Double
    , maMarginPercent :: Double
    , maProfit :: Double
    , maIsHealthy :: Bool
    } deriving (Show, Eq)

-- | Price gap analysis result
data PriceGapAnalysis = PriceGapAnalysis
    { pgaProductId :: Int
    , pgaCompetitorPrice :: Double
    , pgaOurPrice :: Double
    , pgaGap :: Double
    , pgaGapPercent :: Double
    , pgaRecommendation :: PriceRecommendation
    } deriving (Show, Eq)

-- =============================================================================
-- Client Construction
-- =============================================================================

-- | Build marketplace client for a user
buildMarketplaceClient :: UserId -> Maybe WBClient -> Maybe OzonClient -> MarketplaceClient
buildMarketplaceClient userId mbClient moClient = MarketplaceClient
    { mcWBClient = mbClient
    , mcOzonClient = moClient
    , mcUserId = userId
    }

-- | Execute operations with marketplace clients
withMarketplaceClients
    :: (AppE es)
    => Maybe WBClient
    -> Maybe OzonClient
    -> UserId
    -> (MarketplaceClient -> Eff es a)
    -> Eff es a
withMarketplaceClients mbClient moClient userId action = do
    let client = MarketplaceClient mbClient moClient userId
    action client

-- =============================================================================
-- Product Fetching Operations
-- =============================================================================

-- | Fetch products from all configured marketplaces
fetchAllProducts :: (AppE es) => MarketplaceClient -> Eff es [MarketplaceProduct]
fetchAllProducts client = do
    wbProducts <- fetchWBProducts client
    ozonProducts <- fetchOzonProducts client
    pure $ wbProducts <> ozonProducts

-- | Fetch products from WB
fetchWBProducts :: (AppE es) => MarketplaceClient -> Eff es [MarketplaceProduct]
fetchWBProducts client = do
    case mcWBClient client of
        Nothing -> pure []
        Just wbClient -> do
            -- In real implementation, call WB API
            -- result <- liftIO $ getProducts wbClient
            -- Currently return mock data
            pure $ mockWBProducts (mcUserId client)

-- | Fetch products from Ozon
fetchOzonProducts :: (AppE es) => MarketplaceClient -> Eff es [MarketplaceProduct]
fetchOzonProducts client = do
    case mcOzonClient client of
        Nothing -> pure []
        Just ozonClient -> do
            -- In real implementation, call Ozon API
            -- result <- liftIO $ getProducts ozonClient
            -- Currently return mock data
            pure $ mockOzonProducts (mcUserId client)

-- Mock data helpers
mockWBProducts :: UserId -> [MarketplaceProduct]
mockWBProducts uid =
    [ MarketplaceProduct
        { mpId = 1
        , mpUserId = uid
        , mpMarketplace = WB
        , mpExternalId = "WB001"
        , mpName = "WB Product 1"
        , mpCost = 50.0
        , mpPrice = 100.0
        , mpCompetitorPrice = Just 95.0
        , mpLastUpdated = undefined
        }
    , MarketplaceProduct
        { mpId = 2
        , mpUserId = uid
        , mpMarketplace = WB
        , mpExternalId = "WB002"
        , mpName = "WB Product 2"
        , mpCost = 75.0
        , mpPrice = 150.0
        , mpCompetitorPrice = Just 145.0
        , mpLastUpdated = undefined
        }
    ]

mockOzonProducts :: UserId -> [MarketplaceProduct]
mockOzonProducts uid =
    [ MarketplaceProduct
        { mpId = 3
        , mpUserId = uid
        , mpMarketplace = Ozon
        , mpExternalId = "OZ001"
        , mpName = "Ozon Product 1"
        , mpCost = 60.0
        , mpPrice = 120.0
        , mpCompetitorPrice = Just 115.0
        , mpLastUpdated = undefined
        }
    ]

-- =============================================================================
-- Price Sync Operations
-- =============================================================================

-- | Sync product prices across marketplaces
syncProductPrices :: (AppE es) => MarketplaceClient -> [ProductPriceSync] -> Eff es [PriceUpdateResult]
syncProductPrices client syncs = do
    results <- forM syncs $ \sync -> do
        case pssMarketplace sync of
            WB -> syncWBPrice client sync
            Ozon -> syncOzonPrice client sync
    pure results

-- | Price sync request
data ProductPriceSync = ProductPriceSync
    { pssProductId :: Int
    , pssMarketplace :: Marketplace
    , pssNewPrice :: Double
    , pssExternalId :: Text
    } deriving (Show, Eq)

-- | Sync WB product price
syncWBPrice :: (AppE es) => MarketplaceClient -> ProductPriceSync -> Eff es PriceUpdateResult
syncWBPrice client sync = do
    case mcWBClient client of
        Nothing -> pure $ PriceUpdateResult
            { purSuccess = False
            , purProductId = pssProductId sync
            , purOldPrice = 0
            , purNewPrice = pssNewPrice sync
            , purMarketplace = WB
            , purError = Just "WB client not configured"
            }
        Just wbClient -> do
            -- In real implementation, call WB API
            -- result <- liftIO $ updatePrice wbClient priceUpdate
            pure $ PriceUpdateResult
                { purSuccess = True
                , purProductId = pssProductId sync
                , purOldPrice = 100.0  -- Would get from DB in real impl
                , purNewPrice = pssNewPrice sync
                , purMarketplace = WB
                , purError = Nothing
                }

-- | Sync Ozon product price
syncOzonPrice :: (AppE es) => MarketplaceClient -> ProductPriceSync -> Eff es PriceUpdateResult
syncOzonPrice client sync = do
    case mcOzonClient client of
        Nothing -> pure $ PriceUpdateResult
            { purSuccess = False
            , purProductId = pssProductId sync
            , purOldPrice = 0
            , purNewPrice = pssNewPrice sync
            , purMarketplace = Ozon
            , purError = Just "Ozon client not configured"
            }
        Just ozonClient -> do
            -- In real implementation, call Ozon API
            -- result <- liftIO $ updatePrices ozonClient priceUpdate
            pure $ PriceUpdateResult
                { purSuccess = True
                , purProductId = pssProductId sync
                , purOldPrice = 120.0  -- Would get from DB in real impl
                , purNewPrice = pssNewPrice sync
                , purMarketplace = Ozon
                , purError = Nothing
                }

-- =============================================================================
-- Analysis Operations
-- =============================================================================

-- | Calculate margins for all products
analyzeProductMargins :: (AppE es) => MarketplaceClient -> Eff es [MarginAnalysis]
analyzeProductMargins client = do
    products <- fetchAllProducts client
    pure $ map analyzeProduct products
  where
    analyzeProduct :: MarketplaceProduct -> MarginAnalysis
    analyzeProduct p = let
        margin = case calcMargin (mpPrice p) (mpCost p) of
            Just m -> m
            Nothing -> 0
        profit = mpPrice p - mpCost p
        in MarginAnalysis
            { maProductId = mpId p
            , maCost = mpCost p
            , maPrice = mpPrice p
            , maMarginPercent = margin
            , maProfit = profit
            , maIsHealthy = margin >= 20.0  -- Healthy if >= 20% margin
            }

-- | Compare prices across marketplaces
compareMarketplacePrices :: (AppE es) => MarketplaceClient -> Int -> Eff es [PriceGapAnalysis]
compareMarketplacePrices client productId = do
    products <- fetchAllProducts client
    let product = filter (\p -> mpId p == productId) products
    case product of
        [] -> throwError $ NotFound "Product not found"
        [p] -> pure [analyzeProductGap p]
        ps -> pure $ map analyzeProductGap ps
  where
    analyzeProductGap :: MarketplaceProduct -> PriceGapAnalysis
    analyzeProductGap p = let
        competitorPrice = maybe (mpPrice p) id (mpCompetitorPrice p)
        gap = calcPriceGap competitorPrice (mpPrice p)
        gapPercent = case calcGapPercentage competitorPrice gap of
            Just gp -> gp
            Nothing -> 0
        rec = recommendPrice competitorPrice (mpPrice p)
        in PriceGapAnalysis
            { pgaProductId = mpId p
            , pgaCompetitorPrice = competitorPrice
            , pgaOurPrice = mpPrice p
            , pgaGap = gap
            , pgaGapPercent = gapPercent
            , pgaRecommendation = rec
            }

-- =============================================================================
-- Conversion Functions
-- =============================================================================

-- | Convert MarketplaceProduct to JSON Value
marketplaceProductToJSON :: MarketplaceProduct -> Value
marketplaceProductToJSON p = object
    [ "id" .= mpId p
    , "userId" .= mpUserId p
    , "marketplace" .= show (mpMarketplace p)
    , "externalId" .= mpExternalId p
    , "name" .= mpName p
    , "cost" .= mpCost p
    , "price" .= mpPrice p
    , "competitorPrice" .= mpCompetitorPrice p
    ]

-- | Convert MarginAnalysis to JSON Value
marginAnalysisToJSON :: MarginAnalysis -> Value
marginAnalysisToJSON m = object
    [ "productId" .= maProductId m
    , "cost" .= maCost m
    , "price" .= maPrice m
    , "marginPercent" .= maMarginPercent m
    , "profit" .= maProfit m
    , "isHealthy" .= maIsHealthy m
    ]

-- | Convert PriceGapAnalysis to JSON Value
priceGapAnalysisToJSON :: PriceGapAnalysis -> Value
priceGapAnalysisToJSON a = object
    [ "productId" .= pgaProductId a
    , "competitorPrice" .= pgaCompetitorPrice a
    , "ourPrice" .= pgaOurPrice a
    , "gap" .= pgaGap a
    , "gapPercent" .= pgaGapPercent a
    , "recommendation" .= show (pgaRecommendation a)
    ]

-- | Convert PriceUpdateResult to JSON Value
priceUpdateResultToJSON :: PriceUpdateResult -> Value
priceUpdateResultToJSON r = object
    [ "success" .= purSuccess r
    , "productId" .= purProductId r
    , "oldPrice" .= purOldPrice r
    , "newPrice" .= purNewPrice r
    , "marketplace" .= show (purMarketplace r)
    , "error" .= purError r
    ]