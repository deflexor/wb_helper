-- | API Endpoints - Request handlers for all API routes
module Api.Endpoints
    ( -- * Endpoint handlers
      handleAuthRegister
    , handleAuthLogin
    , handleProductsList
    , handleProductsCreate
    , handleProductGet
    , handleProductUpdatePrice
    , handleMarketplaceWBProducts
    , handleMarketplaceOzonProducts
    , handleMarketplaceWBUpdatePrice
    , handleMarketplaceOzonUpdatePrice
    , handleAnalysisMargins
    , handleAnalysisPriceGaps
    , handleHealthCheck
    ) where

import Control.Monad.IO.Class (liftIO)
import Data.Aeson (encode, decode, object, (.=), Value)
import Data.ByteString.Lazy qualified as LBS
import Data.Text (Text)
import qualified Data.Text as T
import Data.Time (UTCTime, getCurrentTime)
import GHC.Generics (Generic)

import Effect.AppEffect
import Effect.Error
import Database.Schema
import Auth.JWT (Plan(..), JWTClaims(..), generateJWT, validateJWT, UserId)
import Auth.Middleware (AuthResult(..), requirePaid)
import Api.WB.Client (WBClient, getProducts, updatePrice)
import Api.Ozon.Client (OzonClient, getProducts, updatePrices)
import Domain.Margin (calcMargin, calcRequiredPrice)
import Domain.PriceAnalysis (calcPriceGap, calcGapPercentage, recommendPrice, PriceRecommendation(..))

-- | Health check endpoint
handleHealthCheck :: (AppE es) => Eff es Value
handleHealthCheck = pure $ object
    [ "status" .= ("healthy" :: Text)
    , "version" .= ("1.0.0" :: Text)
    ]

-- =============================================================================
-- Auth Endpoints
-- =============================================================================

-- | POST /auth/register - Create new user account
handleAuthRegister :: (AppE es) => Value -> Eff es Value
handleAuthRegister payload = do
    -- Decode registration payload
    case decodeRegisterPayload payload of
        Left err -> throwError $ InvalidInput err
        Right regData -> do
            -- Check if email exists (would query DB in real impl)
            -- For now, just create the user
            currentTime <- liftIO getCurrentTime
            let user = User
                    { userEmail = regEmail regData
                    , userPasswordHash = regPassword regData  -- In real impl: hash this
                    , userApiKey = generateApiKey
                    , userSubscriptionId = Nothing
                    , userCreatedAt = currentTime
                    }
            -- Return success response (in real impl, save to DB)
            pure $ object
                [ "success" .= True
                , "userId" .= (1 :: Int)
                , "email" .= regEmail regData
                , "apiKey" .= generateApiKey
                ]
  where
    generateApiKey :: Text
    generateApiKey = "ak_" <> T.pack (take 32 (cycle "abcdefghijklmnopqrstuvwxyz0123456789"))

-- | Decode registration payload
decodeRegisterPayload :: Value -> Either String RegisterData
decodeRegisterPayload v = do
    -- In real implementation, parse JSON properly
    Right $ RegisterData (T.pack "user@example.com") (T.pack "password123")

data RegisterData = RegisterData
    { regEmail :: Text
    , regPassword :: Text
    } deriving (Show, Eq)

-- | POST /auth/login - Authenticate and return JWT
handleAuthLogin :: (AppE es) => Value -> Eff es Value
handleAuthLogin payload = do
    case decodeLoginPayload payload of
        Left err -> throwError $ InvalidInput err
        Right loginData -> do
            -- Validate credentials (would check DB in real impl)
            if regEmail loginData == T.pack "test@example.com" && regPassword loginData == T.pack "password123"
                then do
                    currentTime <- liftIO getCurrentTime
                    let claims = JWTClaims
                            { jscUserId = 1
                            , jscEmail = regEmail loginData
                            , jscSubscription = Paid
                            , jscExp = 0  -- In real impl: set expiration
                            }
                    -- In real impl, get secret from config
                    let jwt = generateJWT (T.pack "test-secret") claims
                    pure $ object
                        [ "success" .= True
                        , "token" .= jwt
                        , "userId" .= (1 :: Int)
                        , "subscription" .= ("Paid" :: Text)
                        ]
                else throwError $ InvalidInput "Invalid credentials"

decodeLoginPayload :: Value -> Either String RegisterData
decodeLoginPayload v = do
    -- In real implementation, parse JSON properly
    Right $ RegisterData (T.pack "test@example.com") (T.pack "password123")

-- =============================================================================
-- Product Endpoints
-- =============================================================================

-- | GET /products - List user's products from both marketplaces
handleProductsList :: (AppE es) => UserId -> Eff es Value
handleProductsList userId = do
    -- In real implementation, query DB for user's products
    let products = [mockProduct1, mockProduct2]
    pure $ object
        [ "products" .= products
        , "count" .= (2 :: Int)
        ]
  where
    mockProduct1 = object
        [ "id" .= (1 :: Int)
        , "userId" .= userId
        , "marketplace" .= ("WB" :: Text)
        , "externalId" .= ("WB123" :: Text)
        , "name" .= ("Test Product 1" :: Text)
        , "cost" .= (50.0 :: Double)
        , "price" .= (100.0 :: Double)
        ]
    mockProduct2 = object
        [ "id" .= (2 :: Int)
        , "userId" .= userId
        , "marketplace" .= ("Ozon" :: Text)
        , "externalId" .= ("OZ456" :: Text)
        , "name" .= ("Test Product 2" :: Text)
        , "cost" .= (75.0 :: Double)
        , "price" .= (150.0 :: Double)
        ]

-- | POST /products - Add new product
handleProductsCreate :: (AppE es) => UserId -> Value -> Eff es Value
handleProductsCreate userId payload = do
    case decodeProductPayload payload of
        Left err -> throwError $ InvalidInput err
        Right prodData -> do
            -- In real impl, save to DB
            pure $ object
                [ "success" .= True
                , "productId" .= (3 :: Int)
                , "userId" .= userId
                , "marketplace" .= prodMarketplace prodData
                , "externalId" .= prodExternalId prodData
                , "name" .= prodName prodData
                , "cost" .= prodCost prodData
                , "price" .= prodPrice prodData
                ]

data ProductPayload = ProductPayload
    { prodMarketplace :: Text
    , prodExternalId :: Text
    , prodName :: Text
    , prodCost :: Double
    , prodPrice :: Double
    } deriving (Show, Eq)

decodeProductPayload :: Value -> Either String ProductPayload
decodeProductPayload v = do
    -- In real impl, parse JSON properly
    Right $ ProductPayload (T.pack "WB") (T.pack "WB789") (T.pack "New Product") 60.0 120.0

-- | GET /products/:id - Get product details
handleProductGet :: (AppE es) => UserId -> Int -> Eff es Value
handleProductGet userId productId = do
    -- In real impl, query DB
    -- Check ownership
    if productId == 999
        then throwError $ NotFound "Product not found"
        else pure $ object
            [ "id" .= productId
            , "userId" .= userId
            , "marketplace" .= ("WB" :: Text)
            , "externalId" .= ("WB123" :: Text)
            , "name" .= ("Test Product" :: Text)
            , "cost" .= (50.0 :: Double)
            , "price" .= (100.0 :: Double)
            ]

-- | PUT /products/:id/price - Update product price
handleProductUpdatePrice :: (AppE es) => UserId -> Int -> Value -> Eff es Value
handleProductUpdatePrice userId productId payload = do
    case decodePricePayload payload of
        Left err -> throwError $ InvalidInput err
        Right priceData -> do
            -- In real impl, update DB and call marketplace API if needed
            pure $ object
                [ "success" .= True
                , "productId" .= productId
                , "oldPrice" .= (100.0 :: Double)
                , "newPrice" .= priceData
                ]

decodePricePayload :: Value -> Either String Double
decodePricePayload v = do
    -- In real impl, parse JSON properly
    Right 110.0

-- =============================================================================
-- Marketplace Endpoints (Paid subscription required)
-- =============================================================================

-- | GET /marketplace/wb/products - Fetch from WB API
handleMarketplaceWBProducts :: (AppE es) => UserId -> AuthResult -> Eff es Value
handleMarketplaceWBProducts userId authResult = do
    case authResult of
        AuthFailure _ -> throwError $ ExternalServiceError "Unauthorized"
        AuthSuccess _ Free -> throwError $ ExternalServiceError "Paid subscription required"
        AuthSuccess uid Paid -> do
            -- In real impl, call WB API client
            pure $ object
                [ "source" .= ("WB" :: Text)
                , "products" .= ([] :: [Value])
                , "fetchedAt" .= ("2024-01-01T00:00:00Z" :: Text)
                ]

-- | GET /marketplace/ozon/products - Fetch from Ozon API
handleMarketplaceOzonProducts :: (AppE es) => UserId -> AuthResult -> Eff es Value
handleMarketplaceOzonProducts userId authResult = do
    case authResult of
        AuthFailure _ -> throwError $ ExternalServiceError "Unauthorized"
        AuthSuccess _ Free -> throwError $ ExternalServiceError "Paid subscription required"
        AuthSuccess uid Paid -> do
            -- In real impl, call Ozon API client
            pure $ object
                [ "source" .= ("Ozon" :: Text)
                , "products" .= ([] :: [Value])
                , "fetchedAt" .= ("2024-01-01T00:00:00Z" :: Text)
                ]

-- | POST /marketplace/wb/update-price - Update WB price
handleMarketplaceWBUpdatePrice :: (AppE es) => UserId -> AuthResult -> Value -> Eff es Value
handleMarketplaceWBUpdatePrice userId authResult payload = do
    case authResult of
        AuthFailure _ -> throwError $ ExternalServiceError "Unauthorized"
        AuthSuccess _ Free -> throwError $ ExternalServiceError "Paid subscription required"
        AuthSuccess uid Paid -> do
            -- In real impl, call WB API to update price
            pure $ object
                [ "success" .= True
                , "marketplace" .= ("WB" :: Text)
                , "updated" .= True
                ]

-- | POST /marketplace/ozon/update-price - Update Ozon price
handleMarketplaceOzonUpdatePrice :: (AppE es) => UserId -> AuthResult -> Value -> Eff es Value
handleMarketplaceOzonUpdatePrice userId authResult payload = do
    case authResult of
        AuthFailure _ -> throwError $ ExternalServiceError "Unauthorized"
        AuthSuccess _ Free -> throwError $ ExternalServiceError "Paid subscription required"
        AuthSuccess uid Paid -> do
            -- In real impl, call Ozon API to update price
            pure $ object
                [ "success" .= True
                , "marketplace" .= ("Ozon" :: Text)
                , "updated" .= True
                ]

-- =============================================================================
-- Analysis Endpoints
-- =============================================================================

-- | GET /analysis/margins - Calculate margins for all products
handleAnalysisMargins :: (AppE es) => UserId -> Eff es Value
handleAnalysisMargins userId = do
    -- In real impl, fetch products from DB
    let products = [
            (50.0, 100.0)  -- (cost, price)
          , (75.0, 150.0)
          , (30.0, 80.0)
          ]
    let margins = map (\(cost, price) -> object
            [ "cost" .= cost
            , "price" .= price
            , "marginPercent" .= case calcMargin price cost of
                Just m -> m
                Nothing -> 0.0
            , "profit" .= (price - cost)
            ]) products
    pure $ object
        [ "margins" .= margins
        , "count" .= (3 :: Int)
        , "averageMargin" .= (35.0 :: Double)
        ]

-- | GET /analysis/price-gaps - Analyze price gaps vs competitors
handleAnalysisPriceGaps :: (AppE es) => UserId -> Eff es Value
handleAnalysisPriceGaps userId = do
    -- In real impl, fetch competitor data from DB
    let analyses = [
            object
                [ "productId" .= (1 :: Int)
                , "productName" .= ("Test Product" :: Text)
                , "competitorPrice" .= (95.0 :: Double)
                , "ourPrice" .= (100.0 :: Double)
                , "gap" .= (-5.0 :: Double)
                , "gapPercent" .= case calcGapPercentage 95.0 (-5.0) of
                    Just p -> p
                    Nothing -> 0.0
                , "recommendation" .= (show $ recommendPrice 95.0 100.0 :: Text)
                ],
            object
                [ "productId" .= (2 :: Int)
                , "productName" .= ("Test Product 2" :: Text)
                , "competitorPrice" .= (110.0 :: Double)
                , "ourPrice" .= (100.0 :: Double)
                , "gap" .= (10.0 :: Double)
                , "gapPercent" .= case calcGapPercentage 110.0 10.0 of
                    Just p -> p
                    Nothing -> 0.0
                , "recommendation" .= (show $ recommendPrice 110.0 100.0 :: Text)
                ]
          ]
    pure $ object
        [ "analyses" .= analyses
        , "count" .= (2 :: Int)
        ]