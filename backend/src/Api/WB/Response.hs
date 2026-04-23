-- | Response transformation using lens for WB API
-- Transforms raw JSON responses to domain types using lens operators
module Api.WB.Response
  ( -- * Response Parsing
    parseProductsList
  , parsePriceUpdate
  , parseStatistics
    -- * Lens-based transformations
  , transformProducts
  , transformToDomain
    -- * Helper lenses
  , productsL
  , dataL
  , errorL
  ) where

import Data.Aeson (Value)
import Data.Aeson.Lens (key, _Array, _String, _Number, _Bool)
import Data.Text (Text)
import Data.Maybe (mapMaybe)
import Control.Lens (Lens', lens, Traversal', (^?), (^..), folded)
import Control.Monad (unless)
import Api.WB.Types

-- | Lens for accessing products array in response
productsL :: Traversal' Value Value
productsL = key "products" . _Array

-- | Lens for accessing data field in response
dataL :: Traversal' Value Value
dataL = key "data"

-- | Lens for accessing error message
errorL :: Traversal' Value Text
errorL = key "error" . _String

-- | Parse WB products list response using lens
--
-- Expected JSON structure:
-- {
--   "products": [
--     { "id": "123", "name": "Product", "price": 100.00, "cost": 50.00, "stock": 10 },
--     ...
--   ]
-- }
parseProductsList :: Value -> Either Text [WBProduct]
parseProductsList val = do
  productsValue <- case val ^? productsL of
    Nothing -> Left "Missing 'products' field"
    Just arr -> Right arr

  products <- case traverse (^? _Array) productsValue of
    Just productsArr -> Right $ concat productsArr
    Nothing -> case val ^? productsL of
      Just arr -> parseProductArray arr
      Nothing -> Left "Invalid products format"

  let results = mapMaybe parseProductFromValue products
  if length results /= length products
    then Left "Failed to parse some products"
    else Right results
  where
    parseProductArray :: Value -> Either Text [Value]
    parseProductArray arr = Right $ arr ^.. folded

-- | Parse a single product from a Value using lens
parseProductFromValue :: Value -> Maybe WBProduct
parseProductFromValue val = do
  idStr <- val ^? key "id" . _String
  nameStr <- val ^? key "name" . _String
  priceNum <- val ^? key "price" . _Number
  costNum <- val ^? key "cost" . _Number
  stockNum <- val ^? key "stock" . _Number

  let price = realToFrac priceNum :: Double
      cost = realToFrac costNum :: Double
      stock = round stockNum

  Just $ WBProduct idStr nameStr price cost stock

-- | Parse price update response using lens
--
-- Expected JSON structure:
-- {
--   "data": { "id": "123", "price": 100.00 },
--   "success": true,
--   "message": ""
-- }
parsePriceUpdate :: Value -> Either Text WBPriceUpdate
parsePriceUpdate val = do
  success <- case val ^? key "success" . _Bool of
    Nothing -> Left "Missing 'success' field"
    Just s -> Right s

  unless success $ do
    msg <- case val ^? key "message" . _String of
      Nothing -> Right "Unknown error"
      Just m -> Right m
    Left msg

  dataObj <- case val ^? dataL of
    Nothing -> Left "Missing 'data' field"
    Just obj -> Right obj

  parsePriceUpdateData dataObj

  where
    parsePriceUpdateData :: Value -> Either Text WBPriceUpdate
    parsePriceUpdateData v = do
      pid <- case v ^? key "id" . _String of
        Nothing -> Left "Missing 'id' in data"
        Just p -> Right p
      priceNum <- case v ^? key "price" . _Number of
        Nothing -> Left "Missing 'price' in data"
        Just p -> Right $ realToFrac p :: Double
      Right $ WBPriceUpdate pid priceNum

-- | Parse statistics response using lens
--
-- Expected JSON structure:
-- {
--   "data": {
--     "product_id": "123",
--     "views": 100,
--     "clicks": 10,
--     "orders": 2,
--     "revenue": 5000.00
--   },
--   "success": true
-- }
parseStatistics :: Value -> Either Text WBStatistics
parseStatistics val = do
  dataObj <- case val ^? dataL of
    Nothing -> Left "Missing 'data' field"
    Just obj -> Right obj

  productId <- case dataObj ^? key "product_id" . _String of
    Nothing -> Left "Missing 'product_id'"
    Just p -> Right p

  views <- case dataObj ^? key "views" . _Number of
    Nothing -> Left "Missing 'views'"
    Just v -> Right $ round v

  clicks <- case dataObj ^? key "clicks" . _Number of
    Nothing -> Left "Missing 'clicks'"
    Just c -> Right $ round c

  orders <- case dataObj ^? key "orders" . _Number of
    Nothing -> Left "Missing 'orders'"
    Just o -> Right $ round o

  revenueNum <- case dataObj ^? key "revenue" . _Number of
    Nothing -> Left "Missing 'revenue'"
    Just r -> Right $ realToFrac r :: Double

  Right $ WBStatistics productId views clicks orders revenueNum

-- | Transform a list of WBProducts using lens
transformProducts :: (WBProduct -> a) -> [WBProduct] -> [a]
transformProducts f = map f

-- | Transform WBProduct to domain model using lens
transformToDomain :: WBProduct -> (ProductId, ProductName, Price, Cost, Stock)
transformToDomain product = (toProductId product, toProductName product, toPrice product, toCost product, toStock product)

-- | Lens for accessing the success field
successFieldL :: Traversal' Value Bool
successFieldL = key "success" . _Bool

-- | Parse the success field
parseSuccess :: Value -> Maybe Bool
parseSuccess = (^? successFieldL)

-- | Get error message from response using lens
parseErrorMessage :: Value -> Maybe Text
parseErrorMessage = (^? errorL)

-- | Check if response indicates error
isErrorResponse :: Value -> Bool
isErrorResponse val = case val ^? successFieldL of
  Nothing -> True
  Just True -> False
  Just False -> True
