-- | Ozon API types
{-# LANGUAGE DerivingStrategies #-}
{-# LANGUAGE StandaloneDeriving #-}
{-# LANGUAGE DeriveAnyClass #-}
{-# LANGUAGE DeriveGeneric #-}

-- | Ozon API types
{-# LANGUAGE OverloadedStrings #-}
module Api.Ozon.Types
  ( -- * Configuration
    OzonApiConfig(..)
  , ozonApiConfigValid
    -- * Authentication
  , OzonAuth(..)
    -- * Product types
  , OzonProduct(..)
  , OzonPrice(..)
  , OzonStock(..)
    -- * API endpoints
  , OzonEndpoint(..)
  , ozonEndpointPath
    -- * Request types
  , OzonProductsRequest(..)
  , OzonPriceUpdateRequest(..)
    -- * Error types
  , OzonApiError(..)
  , renderOzonApiError
  ) where

import Data.Aeson (ToJSON(..), FromJSON)
import Data.Text qualified as T (Text, null, pack)
import Data.Text (Text)
import Data.Time (UTCTime)
import Data.Int (Int64)
import GHC.Exts (IsString(..))
import GHC.Generics (Generic)

-- | Ozon API configuration
data OzonApiConfig = OzonApiConfig
  { oacClientId :: Text
  , oacApiKey :: Text
  , oacBaseUrl :: Text
  , oacRateLimit :: Int  -- ^ Requests per second
  } deriving (Show, Eq)

-- | Validate Ozon API configuration
ozonApiConfigValid :: OzonApiConfig -> Bool
ozonApiConfigValid config
  | T.null (oacClientId config) = False
  | T.null (oacApiKey config) = False
  | T.null (oacBaseUrl config) = False
  | oacRateLimit config <= 0 = False
  | otherwise = True

-- | Ozon API authentication credentials
data OzonAuth = OzonAuth
  { oaClientId :: Text
  , oaApiKey :: Text
  } deriving (Show, Eq)

-- | Ozon product from API
data OzonProduct = OzonProduct
  { opId :: Int
  , opName :: Text
  , opCategory :: Text
  , opPrice :: Double
  , opCost :: Double
  , opStock :: Int
  , opFboStock :: Int
  , opFbsStock :: Int
  , opVisible :: Bool
  , opSku :: Text
  , opOfferId :: Text
  } deriving (Show, Eq, Generic)
    deriving anyclass ToJSON

-- | Ozon price update
data OzonPrice = OzonPrice
  { ozpOfferId :: Text
  , ozpPrice :: Double
  } deriving (Show, Eq, Generic)
    deriving anyclass ToJSON

-- | Ozon stock information
data OzonStock = OzonStock
  { ozsOfferId :: Text
  , ozsStock :: Int
  } deriving (Show, Eq, Generic)
    deriving anyclass ToJSON

-- | Ozon API endpoints
data OzonEndpoint
  = EndpointProducts
  | EndpointProductInfo
  | EndpointPrices
  | EndpointPricesUpdate
  | EndpointStocks
  | EndpointStocksUpdate
  | EndpointStatistics
  deriving (Show, Eq)

-- | Get path for Ozon API endpoint
ozonEndpointPath :: OzonEndpoint -> Text
ozonEndpointPath endpoint = case endpoint of
  EndpointProducts -> "/v2/product/list"
  EndpointProductInfo -> "/v1/product/info"
  EndpointPrices -> "/v1/product/prices"
  EndpointPricesUpdate -> "/v1/product/prices/updates"
  EndpointStocks -> "/v1/product/stocks"
  EndpointStocksUpdate -> "/v1/product/stocks/updates"
  EndpointStatistics -> "/v1/product/stats/info"

-- | Request to list Ozon products
data OzonProductsRequest = OzonProductsRequest
  { oprLimit :: Int
  , oprOffset :: Int
  , oprCategoryId :: Maybe Int64
  , oprVisibility :: Maybe Text
  } deriving (Show, Eq, Generic)
    deriving anyclass ToJSON

-- | Request to update prices
data OzonPriceUpdateRequest = OzonPriceUpdateRequest
  { opurItems :: [OzonPrice]
  } deriving (Show, Eq, Generic)
    deriving anyclass ToJSON

-- | Ozon API errors
data OzonApiError
  = OzonAuthError Text
  | OzonRateLimitError Int  -- ^ Retry after seconds
  | OzonValidationError Text
  | OzonServerError Int Text
  | OzonNetworkError Text
  | OzonParseError Text
  deriving (Show, Eq)

-- | Render Ozon API error as human-readable text
renderOzonApiError :: OzonApiError -> Text
renderOzonApiError err = case err of
  OzonAuthError msg -> "Authentication failed: " <> msg
  OzonRateLimitError secs -> "Rate limited. Retry after " <> tshow secs <> " seconds"
  OzonValidationError msg -> "Validation error: " <> msg
  OzonServerError code msg -> "Server error (" <> tshow code <> "): " <> msg
  OzonNetworkError msg -> "Network error: " <> msg
  OzonParseError msg -> "Parse error: " <> msg

tshow :: Show a => a -> Text
tshow = T.pack . show