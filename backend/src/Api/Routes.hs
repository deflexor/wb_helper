-- | API Routes - Route definitions connecting URLs to handlers
module Api.Routes
    ( appRoutes
    , RouteConfig(..)
    , AuthenticatedRoute
    , PublicRoute
    ) where

import Data.Text (Text)
import qualified Data.Text as T
import Data.ByteString.Lazy qualified as LBS

import Effect.AppEffect
import Effect.Error
import Api.Endpoints
import Auth.JWT (validateJWT, JWTClaims(..), UserId, Plan(..))
import Auth.Middleware (AuthResult(..), withJWT)
import Database.Schema (UserId, Plan(..))

-- | Route configuration
data RouteConfig = RouteConfig
    { rcJWTSecret :: Text
    , rcBasePath :: Text
    } deriving (Show, Eq)

-- | Route handler type
type RouteHandler = LBS.ByteString -> Eff (AppE :+ es) Value

-- | Public route - no auth required
type PublicRoute m = Text -> RouteHandler

-- | Authenticated route - JWT required
type AuthenticatedRoute m = Text -> Text -> RouteHandler

-- | Parse Authorization header
parseAuthHeader :: Text -> Maybe Text
parseAuthHeader authHeader = case T.splitOn " " authHeader of
    ["Bearer", token] -> Just token
    _ -> Nothing

-- | Route matching result
data RouteMatch
    = MatchPublic RouteHandler [Text]
    | MatchAuth (UserId -> AuthResult -> Eff (AppE :+ es) Value) [Text]
    | MatchNotFound
    deriving (Show, Eq)

-- | Route definitions
data RouteDef
    = PublicRoute Text RouteHandler
    | AuthRoute Text (UserId -> AuthResult -> Eff (AppE :+ es) Value)
    | PaidRoute Text (UserId -> AuthResult -> Eff (AppE :+ es) Value)

-- | All application routes
appRoutes :: RouteConfig -> [RouteDef]
appRoutes config =
    -- Public routes (no auth)
    [ PublicRoute "POST /auth/register" handleAuthRegister
    , PublicRoute "POST /auth/login" handleAuthLogin
    , PublicRoute "GET /health" handleHealthCheck

    -- Protected routes (JWT required)
    , AuthRoute "GET /products" handleProductsListAuth
    , AuthRoute "POST /products" handleProductsCreateAuth
    , AuthRoute "GET /products/:id" handleProductGetAuth
    , AuthRoute "PUT /products/:id/price" handleProductUpdatePriceAuth

    -- Marketplace routes (JWT + Paid subscription)
    , PaidRoute "GET /marketplace/wb/products" handleMarketplaceWBProductsAuth
    , PaidRoute "GET /marketplace/ozon/products" handleMarketplaceOzonProductsAuth
    , PaidRoute "POST /marketplace/wb/update-price" handleMarketplaceWBUpdatePriceAuth
    , PaidRoute "POST /marketplace/ozon/update-price" handleMarketplaceOzonUpdatePriceAuth

    -- Analysis routes
    , AuthRoute "GET /analysis/margins" handleAnalysisMarginsAuth
    , AuthRoute "GET /analysis/price-gaps" handleAnalysisPriceGapsAuth
    ]

-- =============================================================================
-- Auth middleware wrappers
-- =============================================================================

-- | Wrapper for authenticated routes
handleProductsListAuth :: UserId -> AuthResult -> Eff (AppE :+ es) Value
handleProductsListAuth = handleProductsList

handleProductsCreateAuth :: UserId -> AuthResult -> Eff (AppE :+ es) Value
handleProductsCreateAuth userId _ = handleProductsCreate userId

handleProductGetAuth :: UserId -> AuthResult -> Eff (AppE :+ es) Value
handleProductGetAuth userId _ productId = handleProductGet userId productId

handleProductUpdatePriceAuth :: UserId -> AuthResult -> Eff (AppE :+ es) Value
handleProductUpdatePriceAuth userId _ payload = handleProductUpdatePrice userId payload

handleAnalysisMarginsAuth :: UserId -> AuthResult -> Eff (AppE :+ es) Value
handleAnalysisMarginsAuth userId _ = handleAnalysisMargins userId

handleAnalysisPriceGapsAuth :: UserId -> AuthResult -> Eff (AppE :+ es) Value
handleAnalysisPriceGapsAuth userId _ = handleAnalysisPriceGaps userId

-- | Wrapper for paid subscription routes
handleMarketplaceWBProductsAuth :: UserId -> AuthResult -> Eff (AppE :+ es) Value
handleMarketplaceWBProductsAuth = handleMarketplaceWBProducts

handleMarketplaceOzonProductsAuth :: UserId -> AuthResult -> Eff (AppE :+ es) Value
handleMarketplaceOzonProductsAuth = handleMarketplaceOzonProducts

handleMarketplaceWBUpdatePriceAuth :: UserId -> AuthResult -> Eff (AppE :+ es) Value
handleMarketplaceWBUpdatePriceAuth = handleMarketplaceWBUpdatePrice

handleMarketplaceOzonUpdatePriceAuth :: UserId -> AuthResult -> Eff (AppE :+ es) Value
handleMarketplaceOzonUpdatePriceAuth = handleMarketplaceOzonUpdatePrice

-- =============================================================================
-- Route matching
-- =============================================================================

-- | Match route path to handler
matchRoute :: [RouteDef] -> Text -> Maybe RouteDef
matchRoute routes path = go routes
  where
    go [] = Nothing
    go (r:rs) = case routeMatches r path of
        Just _ -> Just r
        Nothing -> go rs

-- | Check if route matches path
routeMatches :: RouteDef -> Text -> Bool
routeMatches (PublicRoute routePath _) reqPath =
    routePath == reqPath
routeMatches (AuthRoute routePath _) reqPath =
    routePath == reqPath
routeMatches (PaidRoute routePath _) reqPath =
    routePath == reqPath

-- | Extract route parameters
extractParams :: RouteDef -> Text -> [Text]
extractParams (AuthRoute routePath _) reqPath =
    extractPathParams routePath reqPath
extractParams (PaidRoute routePath _) reqPath =
    extractPathParams routePath reqPath
extractParams _ _ = []

-- | Extract path parameters (e.g., :id)
extractPathParams :: Text -> Text -> [Text]
extractPathParams routePath reqPath = do
    let routeParts = T.splitOn "/" routePath
        reqParts = T.splitOn "/" reqPath
    if length routeParts == length reqParts
        then concatMap checkPart (zip routeParts reqParts)
        else []
  where
    checkPart (routePart, reqPart)
        | T.isPrefixOf ":" routePart = [reqPart]
        | routePart == reqPart = []
        | otherwise = []

-- =============================================================================
-- Request processing
-- =============================================================================

-- | Process incoming request
processRequest
    :: (AppE :+ es)
    => RouteConfig
    -> Text  -- Method
    -> Text  -- Path
    -> Maybe Text  -- Auth header
    -> LBS.ByteString  -- Body
    -> Eff es Value
processRequest config method path authHeader body = do
    case findRoute method path of
        Nothing -> throwError $ NotFound "Route not found"
        Just (route, params) -> do
            result <- authenticateRoute route authHeader
            executeRoute route params result body
  where
    findRoute method' path' = do
        route <- matchRoute (appRoutes config) path'
        let params = extractParams route path'
        return (route, params)

    authenticateRoute route authHeader' = do
        case route of
            PublicRoute _ _ -> pure $ AuthSuccess 0 Free
            AuthRoute _ _ -> do
                case authHeader' >>= parseAuthHeader >>= validateJWT (rcJWTSecret config) of
                    Just claims -> pure $ AuthSuccess (jscUserId claims) (jscSubscription claims)
                    Nothing -> pure $ AuthFailure AuthUnauthorized
            PaidRoute _ _ -> do
                case authHeader' >>= parseAuthHeader >>= validateJWT (rcJWTSecret config) of
                    Just claims -> pure $ AuthSuccess (jscUserId claims) (jscSubscription claims)
                    Nothing -> pure $ AuthFailure AuthUnauthorized

    executeRoute route params authResult body' = do
        case route of
            PublicRoute _ handler -> handler body'
            AuthRoute _ handler -> do
                case authResult of
                    AuthSuccess uid _ -> handler uid params body'
                    AuthFailure _ -> throwError $ ExternalServiceError "Unauthorized"
            PaidRoute _ handler -> do
                case authResult of
                    AuthSuccess uid plan -> handler uid authResult params body'
                    AuthFailure _ -> throwError $ ExternalServiceError "Unauthorized"

-- | Convert method and path to route key
methodPathToRoute :: Text -> Text -> Text
methodPathToRoute method path = method <> " " <> path