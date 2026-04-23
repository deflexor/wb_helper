-- | Tests for Api.Ozon.Client - Ozon API client with rate limiting + retry
module Api.Ozon.ClientSpec where

import Test.Hspec
import Data.Aeson
import Data.Text (Text)
import Data.Decimal (Decimal)
import Control.Lens ((^.), (^?), (&), (.~))
import qualified Data.Vector as V

import Api.Ozon.Types
import Api.Ozon.Response
import Api.Ozon.Client

main :: IO ()
main = hspec spec

spec :: Spec
spec = do
  describe "OzonApiConfig" $ do
    describe "ozonApiConfigValid" $ do
      it "returns True for valid config" $ do
        let config = OzonApiConfig
              { oacClientId = "client123"
              , oacApiKey = "key123"
              , oacBaseUrl = "https://api-seller.ozon.ru"
              , oacRateLimit = 10
              }
        ozonApiConfigValid config `shouldBe` True

      it "returns False for empty clientId" $ do
        let config = OzonApiConfig
              { oacClientId = ""
              , oacApiKey = "key123"
              , oacBaseUrl = "https://api-seller.ozon.ru"
              , oacRateLimit = 10
              }
        ozonApiConfigValid config `shouldBe` False

      it "returns False for empty apiKey" $ do
        let config = OzonApiConfig
              { oacClientId = "client123"
              , oacApiKey = ""
              , oacBaseUrl = "https://api-seller.ozon.ru"
              , oacRateLimit = 10
              }
        ozonApiConfigValid config `shouldBe` False

      it "returns False for zero rateLimit" $ do
        let config = OzonApiConfig
              { oacClientId = "client123"
              , oacApiKey = "key123"
              , oacBaseUrl = "https://api-seller.ozon.ru"
              , oacRateLimit = 0
              }
        ozonApiConfigValid config `shouldBe` False

      it "returns False for negative rateLimit" $ do
        let config = OzonApiConfig
              { oacClientId = "client123"
              , oacApiKey = "key123"
              , oacBaseUrl = "https://api-seller.ozon.ru"
              , oacRateLimit = -5
              }
        ozonApiConfigValid config `shouldBe` False

  describe "OzonEndpoint" $ do
    describe "ozonEndpointPath" $ do
      it "returns correct path for EndpointProducts" $ do
        ozonEndpointPath EndpointProducts `shouldBe` "/v2/product/list"

      it "returns correct path for EndpointPricesUpdate" $ do
        ozonEndpointPath EndpointPricesUpdate `shouldBe` "/v1/product/prices/updates"

      it "returns correct path for EndpointStocks" $ do
        ozonEndpointPath EndpointStocks `shouldBe` "/v1/product/stocks"

      it "returns correct path for EndpointStatistics" $ do
        ozonEndpointPath EndpointStatistics `shouldBe` "/v1/product/stats/info"

  describe "OzonProduct" $ do
    it "has correct Show instance" $ do
      let product = OzonProduct
            { opId = 123
            , opName = "Test Product"
            , opCategory = "Electronics"
            , opPrice = Decimal 100 2
            , opCost = Decimal 70 2
            , opStock = 50
            , opFboStock = 30
            , opFbsStock = 20
            , opVisible = True
            , opSku = "SKU123"
            , opOfferId = "OFFER123"
            }
      show product `shouldContain` "Test Product"
      show product `shouldContain` "123"

  describe "OzonApiError" $ do
    describe "renderOzonApiError" $ do
      it "renders auth error correctly" $ do
        let err = OzonAuthError "Invalid credentials"
        renderOzonApiError err `shouldBe` "Authentication failed: Invalid credentials"

      it "renders rate limit error correctly" $ do
        let err = OzonRateLimitError 60
        renderOzonApiError err `shouldBe` "Rate limited. Retry after 60 seconds"

      it "renders server error correctly" $ do
        let err = OzonServerError 500 "Internal error"
        renderOzonApiError err `shouldBe` "Server error (500): Internal error"

      it "renders network error correctly" $ do
        let err = OzonNetworkError "Connection refused"
        renderOzonApiError err `shouldContain` "Network error"

  describe "Response parsing" $ do
    describe "parseOzonProduct" $ do
      it "parses valid JSON product" $ do
        let json = object
              [ "id" .= (123 :: Int)
              , "name" .= ("Test Product" :: Text)
              , "category_id" .= ("Electronics" :: Text)
              , "price" .= (100000 :: Int)
              , "old_price" .= (70000 :: Int)
              , "stock" .= (50 :: Int)
              , "fbo_stock" .= (30 :: Int)
              , "fbs_stock" .= (20 :: Int)
              , "visible" .= (True :: Bool)
              , "sku" .= ("SKU123" :: Text)
              , "offer_id" .= ("OFFER123" :: Text)
              ]
        case parseOzonProduct json of
          Right product -> do
            opId product `shouldBe` 123
            opName product `shouldBe` "Test Product"
            opStock product `shouldBe` 50
          Left err -> expectationFailure $ "Parse failed: " <> T.unpack err

      it "fails for missing required field" $ do
        let json = object
              [ "name" .= ("Test Product" :: Text)
              , "category_id" .= ("Electronics" :: Text)
              ]
        case parseOzonProduct json of
          Left _ -> pure ()  -- Expected
          Right _ -> expectationFailure "Should have failed with missing id"

      it "parses product with zero stock" $ do
        let json = object
              [ "id" .= (456 :: Int)
              , "name" .= ("Out of Stock Product" :: Text)
              , "category_id" .= ("Clothing" :: Text)
              , "price" .= (5000 :: Int)
              , "old_price" .= (3000 :: Int)
              , "stock" .= (0 :: Int)
              , "fbo_stock" .= (0 :: Int)
              , "fbs_stock" .= (0 :: Int)
              , "visible" .= (False :: Bool)
              , "sku" .= ("SKU456" :: Text)
              , "offer_id" .= ("OFFER456" :: Text)
              ]
        case parseOzonProduct json of
          Right product -> do
            opId product `shouldBe` 456
            opStock product `shouldBe` 0
            opVisible product `shouldBe` False
          Left err -> expectationFailure $ "Parse failed: " <> T.unpack err

    describe "parseOzonProducts" $ do
      it "parses array of products" $ do
        let json = object
              [ "items" .= Array (V.fromList
                [ object
                    [ "id" .= (1 :: Int)
                    , "name" .= ("Product 1" :: Text)
                    , "category_id" .= ("Cat1" :: Text)
                    , "price" .= (1000 :: Int)
                    , "old_price" .= (800 :: Int)
                    , "stock" .= (10 :: Int)
                    , "fbo_stock" .= (5 :: Int)
                    , "fbs_stock" .= (5 :: Int)
                    , "visible" .= (True :: Bool)
                    , "sku" .= ("S1" :: Text)
                    , "offer_id" .= ("O1" :: Text)
                    ]
                , object
                    [ "id" .= (2 :: Int)
                    , "name" .= ("Product 2" :: Text)
                    , "category_id" .= ("Cat2" :: Text)
                    , "price" .= (2000 :: Int)
                    , "old_price" .= (1500 :: Int)
                    , "stock" .= (20 :: Int)
                    , "fbo_stock" .= (10 :: Int)
                    , "fbs_stock" .= (10 :: Int)
                    , "visible" .= (True :: Bool)
                    , "sku" .= ("S2" :: Text)
                    , "offer_id" .= ("O2" :: Text)
                    ]
                ])
              ]
        case parseOzonProducts json of
          Right products -> do
            length products `shouldBe` 2
            opId (head products) `shouldBe` 1
            opId (last products) `shouldBe` 2
          Left err -> expectationFailure $ "Parse failed: " <> T.unpack err

      it "returns empty list for empty items array" $ do
        let json = object ["items" .= Array V.empty]
        case parseOzonProducts json of
          Right products -> length products `shouldBe` 0
          Left err -> expectationFailure $ "Parse failed: " <> T.unpack err

      it "fails when items field is missing" $ do
        let json = object ["result" .= ("ok" :: Text)]
        case parseOzonProducts json of
          Left _ -> pure ()  -- Expected
          Right _ -> expectationFailure "Should have failed without items field"

  describe "Lens transformations" $ do
    it "productIdL extracts id correctly" $ do
      let product = OzonProduct
            { opId = 999
            , opName = "Lens Test"
            , opCategory = "Test"
            , opPrice = Decimal 0 0
            , opCost = Decimal 0 0
            , opStock = 0
            , opFboStock = 0
            , opFbsStock = 0
            , opVisible = True
            , opSku = ""
            , opOfferId = ""
            }
      product ^. productIdL `shouldBe` 999

    it "productIdL can update id" $ do
      let product = OzonProduct
            { opId = 100
            , opName = "Update Test"
            , opCategory = "Test"
            , opPrice = Decimal 0 0
            , opCost = Decimal 0 0
            , opStock = 0
            , opFboStock = 0
            , opFbsStock = 0
            , opVisible = True
            , opSku = ""
            , opOfferId = ""
            }
          updated = product & productIdL .~ 200
      updated ^. productIdL `shouldBe` 200

    it "productNameL extracts name correctly" $ do
      let product = OzonProduct
            { opId = 1
            , opName = "My Product Name"
            , opCategory = "Test"
            , opPrice = Decimal 0 0
            , opCost = Decimal 0 0
            , opStock = 0
            , opFboStock = 0
            , opFbsStock = 0
            , opVisible = True
            , opSku = ""
            , opOfferId = ""
            }
      product ^. productNameL `shouldBe` "My Product Name"

    it "productStockL extracts stock correctly" $ do
      let product = OzonProduct
            { opId = 1
            , opName = "Stock Test"
            , opCategory = "Test"
            , opPrice = Decimal 0 0
            , opCost = Decimal 0 0
            , opStock = 42
            , opFboStock = 30
            , opFbsStock = 12
            , opVisible = True
            , opSku = ""
            , opOfferId = ""
            }
      product ^. productStockL `shouldBe` 42

  describe "OzonAuth" $ do
    it "stores credentials correctly" $ do
      let auth = OzonAuth
            { oaClientId = "my-client-id"
            , oaApiKey = "my-secret-key"
            }
      oaClientId auth `shouldBe` "my-client-id"
      oaApiKey auth `shouldBe` "my-secret-key"

  describe "ozonAuthHeaders" $ do
    it "generates correct header pairs" $ do
      let auth = OzonAuth
            { oaClientId = "client123"
            , oaApiKey = "key456"
            }
          headers = ozonAuthHeaders auth
      length headers `shouldBe` 2
      elem ("Client-Id", "client123") headers `shouldBe` True
      elem ("Api-Key", "key456") headers `shouldBe` True

  describe "OzonPriceUpdateRequest" $ do
    it "stores items correctly" $ do
      let prices = [OzonPrice "offer1" (Decimal 100 2), OzonPrice "offer2" (Decimal 200 2)]
          request = OzonPriceUpdateRequest prices
      length (opurItems request) `shouldBe` 2

  describe "Response validation" $ do
    it "validateOzonResponse returns Nothing for valid response" $ do
      let json = object ["result" .= ("ok" :: Text)]
      validateOzonResponse json `shouldBe` Nothing

    it "validateOzonResponse returns error for error response" $ do
      let json = object ["error" .= ("Something went wrong" :: Text)]
      case validateOzonResponse json of
        Just (OzonValidationError msg) -> msg `shouldBe` "Something went wrong"
        Nothing -> expectationFailure "Should have returned error"
        _ -> expectationFailure "Wrong error type"

    it "hasOzonErrors returns False for valid response" $ do
      let json = object ["result" .= ("ok" :: Text)]
      hasOzonErrors json `shouldBe` False

    it "hasOzonErrors returns True for error response" $ do
      let json = object ["error" .= ("fail" :: Text)]
      hasOzonErrors json `shouldBe` True