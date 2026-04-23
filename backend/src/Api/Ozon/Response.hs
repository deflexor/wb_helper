-- | Response transformation using lens
module Api.Ozon.Response
  ( -- * JSON Parsing
    parseOzonResponse
  , parseOzonProducts
  , parseOzonProduct
    -- * Lens transformations
  , productIdL
  , productNameL
  , productPriceL
  , productCostL
  , productStockL
  , productFboStockL
  , productFbsStockL
  , productVisibleL
  , productSkuL
  , productOfferIdL
    -- * Response validation
  , validateOzonResponse
  , hasOzonErrors
  ) where

import Data.Aeson
import Data.Aeson.Lens
import Data.Text (Text)
import Data.Decimal (Decimal)
import Data.Maybe (maybe)
import Control.Lens (Lens', lens, (&), (.~), (^.), (^?))
import qualified Data.Vector as V

import Api.Ozon.Types

-- | Parse raw JSON into OzonProducts list using lens transformations
parseOzonProducts :: Value -> Either Text [OzonProduct]
parseOzonProducts val = do
  items <- maybe (Left "Missing items field") Right $ do
    obj <- decodeObject val
    obj ^? key "items" _Array
  productList <- mapM parseOzonProduct $ V.toList items
  Right productList

-- | Helper to decode Value as Object
decodeObject :: Value -> Maybe Object
decodeObject (Object obj) = Just obj
decodeObject _ = Nothing

-- | Parse single product from JSON using lens
parseOzonProduct :: Value -> Either Text OzonProduct
parseOzonProduct val = do
  obj <- maybe (Left "Not an object") Right $ decodeObject val
  id <- getField obj "id"
  name <- getField obj "name"
  category <- getField obj "category_id"
  price <- getField obj "price"
  cost <- getField obj "old_price"
  stock <- getField obj "stock"
  fboStock <- getField obj "fbo_stock"
  fbsStock <- getField obj "fbs_stock"
  visible <- getField obj "visible"
  sku <- getField obj "sku"
  offerId <- getField obj "offer_id"
  pure OzonProduct
    { opId = id
    , opName = name
    , opCategory = category
    , opPrice = price
    , opCost = cost
    , opStock = stock
    , opFboStock = fboStock
    , opFbsStock = fbsStock
    , opVisible = visible
    , opSku = sku
    , opOfferId = offerId
    }

-- | Get a required field from object
getField :: FromJSON a => Object -> Text -> Either Text a
getField obj key = case obj ^? key of
  Nothing -> Left $ "Missing field: " <> key
  Just v -> case parseJSON v of
    Error e -> Left $ "Parse error for " <> key <> ": " <> Text.pack e
    Success a -> Right a

-- | Parse general Ozon API response
parseOzonResponse :: FromJSON a => Value -> Either Text a
parseOzonResponse val = case parseJSON val of
  Error e -> Left $ Text.pack e
  Success a -> Right a

-- | Validate Ozon API response has no errors
validateOzonResponse :: Value -> Maybe OzonApiError
validateOzonResponse val = do
  obj <- decodeObject val
  errorMsg <- obj ^? key "error"
  case errorMsg of
    String s -> Just $ OzonValidationError s
    _ -> Nothing

-- | Check if response has errors
hasOzonErrors :: Value -> Bool
hasOzonErrors val = case validateOzonResponse val of
  Nothing -> False
  Just _ -> True

-- | Lens for product ID
productIdL :: Lens' OzonProduct Int64
productIdL = lens opId $ \p v -> p { opId = v }

-- | Lens for product name
productNameL :: Lens' OzonProduct Text
productNameL = lens opName $ \p v -> p { opName = v }

-- | Lens for product price
productPriceL :: Lens' OzonProduct Decimal
productPriceL = lens opPrice $ \p v -> p { opPrice = v }

-- | Lens for product cost
productCostL :: Lens' OzonProduct Decimal
productCostL = lens opCost $ \p v -> p { opCost = v }

-- | Lens for product stock
productStockL :: Lens' OzonProduct Int
productStockL = lens opStock $ \p v -> p { opStock = v }

-- | Lens for FBO stock
productFboStockL :: Lens' OzonProduct Int
productFboStockL = lens opFboStock $ \p v -> p { opFboStock = v }

-- | Lens for FBS stock
productFbsStockL :: Lens' OzonProduct Int
productFbsStockL = lens opFbsStock $ \p v -> p { opFbsStock = v }

-- | Lens for visibility
productVisibleL :: Lens' OzonProduct Bool
productVisibleL = lens opVisible $ \p v -> p { opVisible = v }

-- | Lens for SKU
productSkuL :: Lens' OzonProduct Text
productSkuL = lens opSku $ \p v -> p { opSku = v }

-- | Lens for offer ID
productOfferIdL :: Lens' OzonProduct Text
productOfferIdL = lens opOfferId $ \p v -> p { opOfferId = v }