-- | API Routes - Route definitions connecting URLs to handlers
{-# LANGUAGE ScopedTypeVariables #-}
{-# LANGUAGE RankNTypes #-}
{-# LANGUAGE OverloadedStrings #-}
module Api.Routes
    ( appRoutes
    , RouteConfig(..)
    , AuthenticatedRoute
    , PublicRoute
    ) where

import Data.Text (Text)
import qualified Data.Text as T
import Data.ByteString.Lazy qualified as LBS
import Data.Aeson (Value, decode)
import Data.Either (either)

import Effect.AppEffect
import Effect.Error
import Api.Endpoints
import Auth.JWT (validateJWT, JWTClaims(..), UserId, Plan(..))
import Auth.Middleware (AuthResult(..), AuthError(..), withJWT)

-- | Route configuration
data RouteConfig = RouteConfig
    { rcJWTSecret :: Text
    , rcBasePath :: Text
    } deriving (Show, Eq)

-- | Route handler type
type RouteHandler = forall es. (AppE es) => Value -> Eff es Value

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
    | MatchAuth (forall es. (AppE es) => UserId -> AuthResult -> Eff es Value) [Text]
    | MatchNotFound

-- | Route definitions
data RouteDef
    = PublicRoute Text RouteHandler
    | AuthRoute Text (forall es. (AppE es) => UserId -> AuthResult -> Value -> Eff es Value)
    | PaidRoute Text (forall es. (AppE es) => UserId -> AuthResult -> Value -> Eff es Value)

-- | Wrapper to ignore body for handlers that don't need it
ignoreBody :: (AppE es) => Eff es Value -> Value -> Eff es Value
ignoreBody handler _ = handler

-- | All application routes
appRoutes :: RouteConfig -> [RouteDef]
appRoutes config =
    -- Public routes (no auth)
    [ PublicRoute "POST /auth/register" handleAuthRegister
    , PublicRoute "POST /auth/login" handleAuthLogin
    , PublicRoute "GET /health" (ignoreBody handleHealthCheck)

    -- Protected routes (JWT required)
    , AuthRoute "GET /products" handleProductsListAuth
    , AuthRoute "POST /products" handleProductsCreateAuth

    -- Marketplace routes (JWT + Paid subscription)
    , PaidRoute "GET /marketplace/wb/products" handleMarketplaceWBProductsAuth
    , PaidRoute "GET /marketplace/ozon/products" handleMarketplaceOzonProductsAuth

    -- Analysis routes
    , AuthRoute "GET /analysis/margins" handleAnalysisMarginsAuth
    , AuthRoute "GET /analysis/price-gaps" handleAnalysisPriceGapsAuth
    ]

-- =============================================================================
-- Auth middleware wrappers
-- =============================================================================

-- | Wrapper for authenticated routes
handleProductsListAuth :: (AppE es) => UserId -> AuthResult -> Value -> Eff es Value
handleProductsListAuth userId _ _ = handleProductsList userId

handleProductsCreateAuth :: (AppE es) => UserId -> AuthResult -> Value -> Eff es Value
handleProductsCreateAuth userId _ payload = handleProductsCreate userId payload

handleAnalysisMarginsAuth :: (AppE es) => UserId -> AuthResult -> Value -> Eff es Value
handleAnalysisMarginsAuth userId _ _ = handleAnalysisMargins userId

handleAnalysisPriceGapsAuth :: (AppE es) => UserId -> AuthResult -> Value -> Eff es Value
handleAnalysisPriceGapsAuth userId _ _ = handleAnalysisPriceGaps userId

-- | Wrapper for paid subscription routes
handleMarketplaceWBProductsAuth :: (AppE es) => UserId -> AuthResult -> Value -> Eff es Value
handleMarketplaceWBProductsAuth userId authResult _ = handleMarketplaceWBProducts userId authResult

handleMarketplaceOzonProductsAuth :: (AppE es) => UserId -> AuthResult -> Value -> Eff es Value
handleMarketplaceOzonProductsAuth userId authResult _ = handleMarketplaceOzonProducts userId authResult

-- =============================================================================
-- Route matching
-- =============================================================================

-- | Match route path to handler
matchRoute :: [RouteDef] -> Text -> Maybe RouteDef
matchRoute routes path = go routes
  where
    go [] = Nothing
    go (r:rs) = case routeMatches r path of
        True -> Just r
        False -> go rs

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
    :: (AppE es)
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
                let validateResult = do
                        token <- authHeader' >>= parseAuthHeader
                        either (const Nothing) Just (validateJWT (rcJWTSecret config) token)
                case validateResult of
                    Just claims -> pure $ AuthSuccess (jscUserId claims) (jscSubscription claims)
                    Nothing -> pure $ AuthFailure AuthUnauthorized
            PaidRoute _ _ -> do
                let validateResult = do
                        token <- authHeader' >>= parseAuthHeader
                        either (const Nothing) Just (validateJWT (rcJWTSecret config) token)
                case validateResult of
                    Just claims -> pure $ AuthSuccess (jscUserId claims) (jscSubscription claims)
                    Nothing -> pure $ AuthFailure AuthUnauthorized

    executeRoute route params authResult body' = do
        let mBody = decode body' :: Maybe Value
        case mBody of
            Nothing -> throwError $ ExternalServiceError "Invalid request body"
            Just body -> case route of
                PublicRoute _ handler -> handler body
                AuthRoute _ handler -> do
                    case authResult of
                        AuthSuccess uid _ -> handler uid authResult body
                        AuthFailure _ -> throwError $ ExternalServiceError "Unauthorized"
                PaidRoute _ handler -> do
                    case authResult of
                        AuthSuccess uid plan -> handler uid authResult body
                        AuthFailure _ -> throwError $ ExternalServiceError "Unauthorized"

-- | Convert method and path to route key
methodPathToRoute :: Text -> Text -> Text
methodPathToRoute method path = method <> " " <> path