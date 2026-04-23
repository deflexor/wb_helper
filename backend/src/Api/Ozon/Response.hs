-- | Response transformation for Ozon API
{-# LANGUAGE OverloadedStrings #-}
module Api.Ozon.Response
  ( parseOzonProducts
  , parseOzonProduct
  ) where

import Data.Aeson (Value, Object)
import Data.Aeson qualified as A
import Data.Aeson.Key (Key)
import Data.Aeson.Key qualified as K
import Data.Aeson.Types (parseEither)
import Data.Text (Text)
import Data.Text qualified as T
import qualified Data.Vector as V

import Api.Ozon.Types

-- | Parse raw JSON into OzonProducts list
parseOzonProducts :: Value -> Either Text [OzonProduct]
parseOzonProducts val = case val of
  A.Object obj -> do
    items <- convertEither $ parseEither (obj A..:) (K.fromText "items")
    case items of
      A.Array arr -> traverse parseOzonProduct (V.toList arr)
      _ -> Left "Items field is not an array"
  _ -> Left "Not an object"

-- | Parse single product from JSON
parseOzonProduct :: Value -> Either Text OzonProduct
parseOzonProduct val = case val of
  A.Object obj -> do
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
    Right OzonProduct
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
  _ -> Left "Not an object"

convertEither :: Either String a -> Either Text a
convertEither (Left e) = Left $ T.pack e
convertEither (Right v) = Right v

getField :: A.FromJSON a => Object -> Text -> Either Text a
getField obj key = convertEither $ parseEither (obj A..:) (K.fromText key)
