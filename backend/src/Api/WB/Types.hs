-- | Types for WB API responses and domain model transformations
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

-- | Product ID type
newtype ProductId = ProductId { unProductId :: Text }
  deriving (Show, Eq, Ord)

-- | Product name type
newtype ProductName = ProductName { unProductName :: Text }
  deriving (Show, Eq)

-- | Price type (using Double for decimal precision)
newtype Price = Price { unPrice :: Double }
  deriving (Show, Eq, Ord)

-- | Cost type
newtype Cost = Cost { unCost :: Double }
  deriving (Show, Eq)

-- | Stock quantity type
newtype Stock = Stock { unStock :: Int }
  deriving (Show, Eq, Ord)

-- | Raw WB API product response
data WBProduct = WBProduct
  { wbpId        :: !Text
  , wbpName      :: !Text
  , wbpPrice     :: !Double
  , wbpCost      :: !Double
  , wbpStock     :: !Int
  } deriving (Show, Eq, Generic)

-- | WB API price update request
data WBPriceUpdate = WBPriceUpdate
  { wbpuId    :: !Text
  , wbpuPrice :: !Double
  } deriving (Show, Eq, Generic)

-- | WB API statistics response
data WBStatistics = WBStatistics
  { wbsProductId :: !Text
  , wbsViews     :: !Int
  , wbsClicks    :: !Int
  , wbsOrders    :: !Int
  , wbsRevenue   :: !Double
  } deriving (Show, Eq, Generic)

-- | Generic WB API response wrapper
data WBApiResponse a = WBApiResponse
  { wbarData    :: !a
  , wbarSuccess :: !Bool
  , wbarMessage :: !Text
  } deriving (Show, Eq)

-- | WB API error response
data WBError = WBError
  { wbeCode    :: !Int
  , wbeMessage :: !Text
  } deriving (Show, Eq)

-- | Convert WBProduct to domain types
toProductId :: WBProduct -> ProductId
toProductId = ProductId . wbpId

toProductName :: WBProduct -> ProductName
toProductName = ProductName . wbpName

toPrice :: WBProduct -> Price
toPrice = Price . wbpPrice

toCost :: WBProduct -> Cost
toCost = Cost . wbpCost

toStock :: WBProduct -> Stock
toStock = Stock . wbpStock

-- Aeson instances for WBProduct
instance FromJSON WBProduct where
  parseJSON = withObject "WBProduct" $ \obj -> WBProduct
    <$> obj .: "id"
    <*> obj .: "name"
    <*> obj .: "price"
    <*> obj .: "cost"
    <*> obj .: "stock"

instance ToJSON WBProduct where
  toJSON WBProduct{..} = A.object
    [ "id"    .= wbpId
    , "name"  .= wbpName
    , "price" .= wbpPrice
    , "cost"  .= wbpCost
    , "stock" .= wbpStock
    ]

-- Aeson instances for WBPriceUpdate
instance FromJSON WBPriceUpdate where
  parseJSON = withObject "WBPriceUpdate" $ \obj -> WBPriceUpdate
    <$> obj .: "id"
    <*> obj .: "price"

instance ToJSON WBPriceUpdate where
  toJSON WBPriceUpdate{..} = A.object
    [ "id"    .= wbpuId
    , "price" .= wbpuPrice
    ]

-- Aeson instances for WBStatistics
instance FromJSON WBStatistics where
  parseJSON = withObject "WBStatistics" $ \obj -> WBStatistics
    <$> obj .: "product_id"
    <*> obj .: "views"
    <*> obj .: "clicks"
    <*> obj .: "orders"
    <*> obj .: "revenue"

instance ToJSON WBStatistics where
  toJSON WBStatistics{..} = A.object
    [ "product_id" .= wbsProductId
    , "views"      .= wbsViews
    , "clicks"     .= wbsClicks
    , "orders"     .= wbsOrders
    , "revenue"    .= wbsRevenue
    ]

-- Aeson instances for WBApiResponse
instance FromJSON a => FromJSON (WBApiResponse a) where
  parseJSON = withObject "WBApiResponse" $ \obj -> WBApiResponse
    <$> obj .: "data"
    <*> obj .: "success"
    <*> obj .: "message"

instance ToJSON a => ToJSON (WBApiResponse a) where
  toJSON WBApiResponse{..} = A.object
    [ "data"    .= wbarData
    , "success" .= wbarSuccess
    , "message" .= wbarMessage
    ]

-- Aeson instances for WBError
instance FromJSON WBError where
  parseJSON = withObject "WBError" $ \obj -> WBError
    <$> obj .: "code"
    <*> obj .: "message"

instance ToJSON WBError where
  toJSON WBError{..} = A.object
    [ "code"    .= wbeCode
    , "message" .= wbeMessage
    ]
