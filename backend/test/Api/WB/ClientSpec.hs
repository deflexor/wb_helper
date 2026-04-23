-- | Tests for Api.WB.Client - WB API Client
module Api.WB.ClientSpec where

import Test.Hspec
import Data.Aeson (Value, encode, decode')
import Data.Aeson qualified as A
import Data.Text (Text)
import Control.Exception (throwIO)
import Network.HTTP.Client (HttpException(..))
import Network.HTTP.Types (Status(..), statusCode)
import Data.Monoid (mempty)
import Control.Concurrent.STM (TVar, atomically, newTVarIO, readTVarIO, modifyTVar')
import GHC.Generics (Generic)

import Api.WB.Types
import Api.WB.Response
import Api.WB.Client

-- Test data
sampleProductsJson :: Value
sampleProductsJson = A.object
  [ "products" .= A.array
      [ A.object
          [ "id" .= ("123" :: Text)
          , "name" .= ("Test Product 1" :: Text)
          , "price" .= (100.50 :: Double)
          , "cost" .= (50.25 :: Double)
          , "stock" .= (10 :: Int)
          ]
      , A.object
          [ "id" .= ("456" :: Text)
          , "name" .= ("Test Product 2" :: Text)
          , "price" .= (200.00 :: Double)
          , "cost" .= (100.00 :: Double)
          , "stock" .= (20 :: Int)
          ]
      ]
  ]

samplePriceUpdateJson :: Value
samplePriceUpdateJson = A.object
  [ "data" .= A.object
      [ "id" .= ("123" :: Text)
      , "price" .= (150.00 :: Double)
      ]
  , "success" .= True
  , "message" .= ("" :: Text)
  ]

sampleStatisticsJson :: Value
sampleStatisticsJson = A.object
  [ "data" .= A.object
      [ "product_id" .= ("123" :: Text)
      , "views" .= (1000 :: Int)
      , "clicks" .= (100 :: Int)
      , "orders" .= (10 :: Int)
      , "revenue" .= (5000.00 :: Double)
      ]
  , "success" .= True
  ]

sampleErrorJson :: Value
sampleErrorJson = A.object
  [ "error" .= ("Invalid API key" :: Text)
  , "success" .= False
  ]

main :: IO ()
main = hspec spec

spec :: Spec
spec = do
  describe "Api.WB.Types" $ do
    describe "WBProduct" $ do
      it "parses from JSON correctly" $ do
        let json = A.object
              [ "id" .= ("123" :: Text)
              , "name" .= ("Test Product" :: Text)
              , "price" .= (100.50 :: Double)
              , "cost" .= (50.25 :: Double)
              , "stock" .= (10 :: Int)
              ]
            result = decode' (encode json) :: Maybe WBProduct
        result `shouldBe` (Just $ WBProduct "123" "Test Product" 100.50 50.25 10)

      it "roundtrips through JSON" $ do
        let product = WBProduct "123" "Test" 100.50 50.25 10
            json = encode product
            result = decode' json :: Maybe WBProduct
        result `shouldBe` Just product

    describe "WBPriceUpdate" $ do
      it "parses from JSON correctly" $ do
        let json = A.object
              [ "id" .= ("123" :: Text)
              , "price" .= (150.00 :: Double)
              ]
            result = decode' (encode json) :: Maybe WBPriceUpdate
        result `shouldBe` (Just $ WBPriceUpdate "123" 150.00)

    describe "WBStatistics" $ do
      it "parses from JSON correctly" $ do
        let json = A.object
              [ "product_id" .= ("123" :: Text)
              , "views" .= (1000 :: Int)
              , "clicks" .= (100 :: Int)
              , "orders" .= (10 :: Int)
              , "revenue" .= (5000.00 :: Double)
              ]
            result = decode' (encode json) :: Maybe WBStatistics
        result `shouldBe` (Just $ WBStatistics "123" 1000 100 10 5000.00)

  describe "Api.WB.Response" $ do
    describe "parseProductsList" $ do
      it "parses products list from JSON" $ do
        let result = parseProductsList sampleProductsJson
        case result of
          Left err -> expectationFailure $ "Expected success, got: " <> T.unpack err
          Right products -> do
            length products `shouldBe` 2
            head products `shouldBe` WBProduct "123" "Test Product 1" 100.50 50.25 10

      it "returns error for missing products field" $ do
        let json = A.object [ "data" .= ("test" :: Text) ]
            result = parseProductsList json
        result `shouldSatisfy` isLeft

      it "returns error for invalid product data" $ do
        let json = A.object
              [ "products" .= A.array
                  [ A.object
                      [ "id" .= ("123" :: Text)
                      -- missing required fields
                      ]
                  ]
              ]
            result = parseProductsList json
        result `shouldSatisfy` isLeft

    describe "parsePriceUpdate" $ do
      it "parses successful price update" $ do
        let result = parsePriceUpdate samplePriceUpdateJson
        case result of
          Left err -> expectationFailure $ "Expected success, got: " <> T.unpack err
          Right update -> do
            wbpuId update `shouldBe` "123"
            wbpuPrice update `shouldBe` 150.00

      it "returns error for failed price update" $ do
        let json = A.object
              [ "success" .= False
              , "message" .= ("Price update failed" :: Text)
              ]
            result = parsePriceUpdate json
        result `shouldSatisfy` isLeft

    describe "parseStatistics" $ do
      it "parses statistics from JSON" $ do
        let result = parseStatistics sampleStatisticsJson
        case result of
          Left err -> expectationFailure $ "Expected success, got: " <> T.unpack err
          Right stats -> do
            wbsProductId stats `shouldBe` "123"
            wbsViews stats `shouldBe` 1000
            wbsClicks stats `shouldBe` 100
            wbsOrders stats `shouldBe` 10
            wbsRevenue stats `shouldBe` 5000.00

      it "returns error for missing data field" $ do
        let json = A.object [ "success" .= True ]
            result = parseStatistics json
        result `shouldSatisfy` isLeft

    describe "transformToDomain" $ do
      it "transforms WBProduct to domain types" $ do
        let product = WBProduct "123" "Test" 100.50 50.25 10
            (pid, pname, price, cost, stock) = transformToDomain product
        unProductId pid `shouldBe` "123"
        unProductName pname `shouldBe` "Test"
        unPrice price `shouldBe` 100.50
        unCost cost `shouldBe` 50.25
        unStock stock `shouldBe` 10

  describe "Api.WB.Client" $ do
    describe "wbBaseUrl" $ do
      it "is correctly formed" $ do
        wbBaseUrl `shouldBe` "https://suppliers-api.wildberries.ru/api/v1"

    describe "wbEndpointToPath" $ do
      it "returns correct path for products" $ do
        wbEndpointToPath WBProductsList `shouldBe` "/products"

      it "returns correct path for price update" $ do
        wbEndpointToPath WBPriceUpdate `shouldBe` "/products/prices"

      it "returns correct path for statistics" $ do
        wbEndpointToPath WBStatistics `shouldBe` "/products/statistics"

    describe "WBClientConfig" $ do
      it "has valid default values" $ do
        let config = defaultWBClientConfig "test-key" undefined
        wbccCacheTtl config `shouldBe` 300

-- Helper functions
isLeft :: Either a b -> Bool
isLeft (Left _) = True
isLeft _ = False

isRight :: Either a b -> Bool
isRight (Right _) = True
isRight _ = False
