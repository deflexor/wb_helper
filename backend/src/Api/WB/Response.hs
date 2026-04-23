-- | Response transformation for WB API
{-# LANGUAGE OverloadedStrings #-}
module Api.WB.Response
  ( parseProductsList
  , parsePriceUpdate
  , parseStatistics
  ) where

import Data.Aeson (Value)
import Data.Aeson qualified as A
import Data.Aeson.Key (Key)
import Data.Aeson.Key qualified as K
import Data.Aeson.Types (parseEither)
import Data.Text (Text)
import Data.Text qualified as T
import Data.Vector (toList)

import Api.WB.Types

convertEither :: Either String a -> Either Text a
convertEither (Left e) = Left $ T.pack e
convertEither (Right v) = Right v

-- | Parse WB products list response
parseProductsList :: Value -> Either Text [WBProduct]
parseProductsList val = case val of
  A.Object obj -> do
    productsValue <- convertEither $ parseEither (obj A..:) (K.fromText "products")
    case productsValue of
      A.Array arr -> traverse parseProductFromValue (toList arr)
      _ -> Left "Products field is not an array"
  _ -> Left "Not an object"

parseProductFromValue :: Value -> Either Text WBProduct
parseProductFromValue v = case v of
  A.Object obj -> do
    pid <- getField obj "id"
    name <- getField obj "name"
    price <- getField obj "price"
    cost <- getField obj "cost"
    stock <- getField obj "stock"
    Right $ WBProduct pid name price cost stock
  _ -> Left "Not an object"

-- | Parse price update response
parsePriceUpdate :: Value -> Either Text WBPriceUpdate
parsePriceUpdate val = case val of
  A.Object obj -> do
    dataObj <- convertEither $ parseEither (obj A..:) (K.fromText "data")
    case dataObj of
      A.Object inner -> do
        pid <- getField inner "id"
        priceNum <- getField inner "price"
        Right $ WBPriceUpdate pid priceNum
      _ -> Left "data is not an object"
  _ -> Left "Not an object"

-- | Parse statistics response
parseStatistics :: Value -> Either Text WBStatistics
parseStatistics val = case val of
  A.Object obj -> do
    dataObj <- convertEither $ parseEither (obj A..:) (K.fromText "data")
    case dataObj of
      A.Object inner -> do
        productId <- getField inner "product_id"
        views <- getField inner "views"
        clicks <- getField inner "clicks"
        orders <- getField inner "orders"
        revenue <- getField inner "revenue"
        Right $ WBStatistics productId views clicks orders revenue
      _ -> Left "data is not an object"
  _ -> Left "Not an object"

getField :: A.FromJSON a => A.Object -> Text -> Either Text a
getField obj key = convertEither $ parseEither (obj A..:) (K.fromText key)
