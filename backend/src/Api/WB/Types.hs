-- | Types for WB API responses and domain model transformations
{-# LANGUAGE OverloadedStrings #-}
module Api.WB.Types
  ( -- * WB API Types
    WBProduct(..)
  , WBPriceUpdate(..)
  , WBStatistics(..)
  , WBApiResponse(..)
  , WBError(..)
    -- * Domain Types (matching Domain modules)
  , ProductId(..)
  , ProductName(..)
  , Price(..)
  , Cost(..)
  , Stock(..)
  ) where

import Data.Text (Text)
import Data.Aeson (FromJSON(..), ToJSON(..), withObject, (.:), (.=))
import Data.Aeson qualified as A
import GHC.Generics (Generic)

-- | WB product from API
data WBProduct = WBProduct
  { wbpId :: Int
  , wbpName :: Text
  , wbpPrice :: Double
  , wbpCost :: Double
  , wbpStock :: Int
  } deriving (Show, Eq, Generic)

-- | WB price update
data WBPriceUpdate = WBPriceUpdate
  { wbpuId :: Int
  , wbpuPrice :: Double
  } deriving (Show, Eq, Generic)

-- | WB statistics
data WBStatistics = WBStatistics
  { wbsProductId :: Int
  , wbsViews :: Int
  , wbsClicks :: Int
  , wbsOrders :: Int
  , wbsRevenue :: Double
  } deriving (Show, Eq, Generic)

-- | Generic API response wrapper
data WBApiResponse a = WBApiResponse
  { wbarData :: a
  , wbarSuccess :: Bool
  , wbarMessage :: Text
  } deriving (Show, Eq, Generic)

-- | WB API error
data WBError = WBError
  { wbeCode :: Int
  , wbeMessage :: Text
  } deriving (Show, Eq, Generic)

-- Domain types for product identification
newtype ProductId = ProductId Int deriving (Show, Eq)
newtype ProductName = ProductName Text deriving (Show, Eq)
newtype Price = Price Double deriving (Show, Eq)
newtype Cost = Cost Double deriving (Show, Eq)
newtype Stock = Stock Int deriving (Show, Eq)

-- Aeson instances for WBProduct
instance FromJSON WBProduct where
  parseJSON = withObject "WBProduct" $ \obj ->
    WBProduct
      <$> obj .: "id"
      <*> obj .: "name"
      <*> obj .: "price"
      <*> obj .: "cost"
      <*> obj .: "stock"

instance ToJSON WBProduct where
  toJSON p = A.object
    [ "id" .= wbpId p
    , "name" .= wbpName p
    , "price" .= wbpPrice p
    , "cost" .= wbpCost p
    , "stock" .= wbpStock p
    ]

-- Aeson instances for WBPriceUpdate
instance FromJSON WBPriceUpdate where
  parseJSON = withObject "WBPriceUpdate" $ \obj ->
    WBPriceUpdate
      <$> obj .: "id"
      <*> obj .: "price"

instance ToJSON WBPriceUpdate where
  toJSON p = A.object
    [ "id" .= wbpuId p
    , "price" .= wbpuPrice p
    ]

-- Aeson instances for WBStatistics
instance FromJSON WBStatistics where
  parseJSON = withObject "WBStatistics" $ \obj ->
    WBStatistics
      <$> obj .: "product_id"
      <*> obj .: "views"
      <*> obj .: "clicks"
      <*> obj .: "orders"
      <*> obj .: "revenue"

instance ToJSON WBStatistics where
  toJSON s = A.object
    [ "product_id" .= wbsProductId s
    , "views" .= wbsViews s
    , "clicks" .= wbsClicks s
    , "orders" .= wbsOrders s
    , "revenue" .= wbsRevenue s
    ]

-- Aeson instances for WBApiResponse
instance FromJSON a => FromJSON (WBApiResponse a) where
  parseJSON = withObject "WBApiResponse" $ \obj ->
    WBApiResponse
      <$> obj .: "data"
      <*> obj .: "success"
      <*> obj .: "message"

instance ToJSON a => ToJSON (WBApiResponse a) where
  toJSON r = A.object
    [ "data" .= wbarData r
    , "success" .= wbarSuccess r
    , "message" .= wbarMessage r
    ]

-- Aeson instances for WBError
instance FromJSON WBError where
  parseJSON = withObject "WBError" $ \obj ->
    WBError
      <$> obj .: "code"
      <*> obj .: "message"

instance ToJSON WBError where
  toJSON e = A.object
    [ "code" .= wbeCode e
    , "message" .= wbeMessage e
    ]