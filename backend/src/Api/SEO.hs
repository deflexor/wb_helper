-- | SEO API Routes - Keyword tracking, clusters, competitor analysis
{-# LANGUAGE ScopedTypeVariables #-}
{-# LANGUAGE RankNTypes #-}
{-# LANGUAGE OverloadedStrings #-}
module Api.SEO
    ( -- * Route Types
      SEORoute(..)
    , SEORouteDef(..)
    , MarketplaceParam(..)
    , SEOHandler

      -- * Route Execution
    , executeSEORoute
    , matchSEORoute
    , validateMarketplace

      -- * API Routes
    , seoRoutes :: [SEORouteDef]

      -- * Re-exports for testing
    , module Domain.SEO
    , module Domain.Marketplace
    ) where

import Data.Aeson (Value, encode, decode, object, (.=), ToJSON(..), FromJSON(..))
import Data.ByteString.Lazy qualified as LBS
import Data.Text (Text)
import qualified Data.Text as T
import Data.Text.Encoding qualified as TEnc
import Data.List (find)
import Data.Maybe (fromMaybe)
import GHC.Generics (Generic)

import Effect.AppEffect
import Effect.Error
import Domain.SEO
    ( Marketplace(..)
    , SeoKeyword(..)
    , KeywordPosition(..)
    , DroppedKeyword(..)
    , KeywordCluster(..)
    , ClusterKeyword(..)
    , CompetitorKeywords(..)
    )
import Domain.Marketplace (parseMarketplace, marketplaceToText)

-- =============================================================================
-- Marketplace Parameter
-- =============================================================================

-- | Marketplace parameter with validation
data MarketplaceParam
    = ValidMarketplace Marketplace
    | InvalidMarketplace Text
    deriving (Show, Eq)

-- | Parse and validate marketplace from query parameter
validateMarketplace :: Text -> MarketplaceParam
validateMarketplace mp =
    case parseMarketplace (T.unpack mp) of
        Just m -> ValidMarketplace m
        Nothing -> InvalidMarketplace mp

-- =============================================================================
-- SEO Route Definitions (GADT)
-- =============================================================================

-- | SEO route routes with marketplace parameter
data SEORoute a where
    -- Keyword routes
    ListKeywords     :: Marketplace -> SEORoute [SeoKeyword]
    AddKeyword        :: SeoKeyword -> SEORoute SeoKeyword
    DeleteKeyword     :: Int -> Marketplace -> SEORoute NoContent
    GetPositions      :: Int -> Marketplace -> SEORoute [KeywordPosition]

    -- Dropped routes
    ListDropped       :: Marketplace -> SEORoute [DroppedKeyword]
    CheckDropped      :: Text -> Marketplace -> SEORoute [DroppedKeyword]

    -- Cluster routes
    ListClusters      :: Marketplace -> SEORoute [KeywordCluster]
    CreateCluster     :: [Int] -> Text -> Marketplace -> SEORoute KeywordCluster
    GetClusterKeywords :: Int -> SEORoute [ClusterKeyword]

    -- Competitor routes
    ExtractCompetitor :: Text -> Marketplace -> SEORoute CompetitorKeywords
    GetCompetitorKeywords :: Text -> Marketplace -> SEORoute [Text]

    -- Collection
    CollectKeywords   :: Text -> Marketplace -> SEORoute [KeywordPosition]
    RefreshPositions  :: Marketplace -> SEORoute [KeywordPosition]

    -- Gap analysis
    GapAnalysis       :: Text -> Marketplace -> SEORoute [Text]

    -- Export
    ExportKeywords    :: Marketplace -> SEORoute Text

    -- Labels
    UpdateLabel       :: Int -> Text -> Marketplace -> SEORoute SeoKeyword

-- | NoContent response type
data NoContent = NoContent
    deriving (Show, Eq)

instance ToJSON NoContent where
    toJSON _ = object ["deleted" .= True]

-- =============================================================================
-- Route Definition for Matching
-- =============================================================================

-- | SEO route definition for pattern matching
data SEORouteDef
    = SEOKeywordRoute Text Text (forall a. SEORoute a -> Maybe (SEORoute a))
    | SEODroppedRoute Text Text (forall a. SEORoute a -> Maybe (SEORoute a))
    | SEOClusterRoute Text Text (forall a. SEORoute a -> Maybe (SEORoute a))
    | SEOCompetitorRoute Text Text (forall a. SEORoute a -> Maybe (SEORoute a))
    | SEOGapRoute Text Text (forall a. SEORoute a -> Maybe (SEORoute a))
    | SEOExportRoute Text Text (forall a. SEORoute a -> Maybe (SEORoute a))
    | SEOLabelRoute Text Text (forall a. SEORoute a -> Maybe (SEORoute a))
    | SEOCollectRoute Text Text (forall a. SEORoute a -> Maybe (SEORoute a))
    | SEORefreshRoute Text Text (forall a. SEORoute a -> Maybe (SEORoute a))

-- | Route handler type
type SEOHandler = forall es a. (AppE es, ToJSON a) => SEORoute a -> Eff es Value

-- =============================================================================
-- Route Matching
-- =============================================================================

-- | Match HTTP method and path to SEO route
matchSEORoute :: Text -> Text -> Text -> Maybe (SEORoute a)
matchSEORoute method path mp
    | method == "GET" && path == "/api/seo/keywords" =
        case validateMarketplace mp of
            ValidMarketplace m -> Just (ListKeywords m)
            InvalidMarketplace _ -> Nothing
    | method == "POST" && path == "/api/seo/keywords" =
        Just (AddKeyword undefined)  -- Body parsed separately
    | method == "DELETE" && "/api/seo/keywords/" `T.isPrefixOf` path =
        case T.stripPrefix "/api/seo/keywords/" path of
            Just idStr ->
                case reads (T.unpack idStr) of
                    [(kwId, "")] ->
                        case validateMarketplace mp of
                            ValidMarketplace m -> Just (DeleteKeyword kwId m)
                            InvalidMarketplace _ -> Nothing
                    _ -> Nothing
            Nothing -> Nothing
    | method == "GET" && "/api/seo/positions/" `T.isPrefixOf` path =
        case T.stripPrefix "/api/seo/positions/" path of
            Just idStr ->
                case reads (T.unpack idStr) of
                    [(kwId, "")] ->
                        case validateMarketplace mp of
                            ValidMarketplace m -> Just (GetPositions kwId m)
                            InvalidMarketplace _ -> Nothing
                    _ -> Nothing
            Nothing -> Nothing
    | method == "GET" && path == "/api/seo/dropped" =
        case validateMarketplace mp of
            ValidMarketplace m -> Just (ListDropped m)
            InvalidMarketplace _ -> Nothing
    | method == "POST" && path == "/api/seo/dropped/check" =
        Just (CheckDropped undefined undefined)  -- Body parsed separately
    | method == "GET" && path == "/api/seo/clusters" =
        case validateMarketplace mp of
            ValidMarketplace m -> Just (ListClusters m)
            InvalidMarketplace _ -> Nothing
    | method == "POST" && path == "/api/seo/clusters" =
        Just (CreateCluster [] undefined undefined)  -- Body parsed separately
    | method == "GET" && "/api/seo/clusters/" `T.isPrefixOf` path &&
       "/keywords" `T.isSuffixOf` path =
        case T.stripSuffix "/keywords" (T.drop (T.length "/api/seo/clusters/") path) of
            Just idStr ->
                case reads (T.unpack idStr) of
                    [(clusterId, "")] -> Just (GetClusterKeywords clusterId)
                    _ -> Nothing
            Nothing -> Nothing
    | method == "POST" && path == "/api/seo/competitor" =
        Just (ExtractCompetitor undefined undefined)  -- Body parsed separately
    | method == "GET" && "/api/seo/competitor/" `T.isPrefixOf` path &&
       "/keywords" `T.isSuffixOf` path =
        case T.stripPrefix "/api/seo/competitor/" path >>= T.stripSuffix "/keywords" of
            Just articleId ->
                case validateMarketplace mp of
                    ValidMarketplace m -> Just (GetCompetitorKeywords articleId m)
                    InvalidMarketplace _ -> Nothing
            Nothing -> Nothing
    | method == "POST" && path == "/api/seo/keywords/collect" =
        Just (CollectKeywords undefined undefined)  -- Body parsed separately
    | method == "POST" && path == "/api/seo/refresh" =
        case validateMarketplace mp of
            ValidMarketplace m -> Just (RefreshPositions m)
            InvalidMarketplace _ -> Nothing
    | method == "GET" && path == "/api/seo/gap-analysis" =
        Just (GapAnalysis undefined undefined)  -- Query params parsed separately
    | method == "GET" && path == "/api/seo/export" =
        case validateMarketplace mp of
            ValidMarketplace m -> Just (ExportKeywords m)
            InvalidMarketplace _ -> Nothing
    | method == "PUT" && "/api/seo/keywords/" `T.isPrefixOf` path &&
       "/label" `T.isSuffixOf` path =
        case T.stripPrefix "/api/seo/keywords/" path >>= T.stripSuffix "/label" of
            Just idStr ->
                case reads (T.unpack idStr) of
                    [(kwId, "")] ->
                        Just (UpdateLabel kwId undefined undefined)  -- Body parsed separately
                    _ -> Nothing
            Nothing -> Nothing
    | otherwise = Nothing

-- =============================================================================
-- Route Execution
-- =============================================================================

-- | Execute SEO route handler
executeSEORoute :: (AppE es) => SEORoute a -> Eff es Value
executeSEORoute route = case route of
    ListKeywords mp -> handleListKeywords mp
    AddKeyword kw -> handleAddKeyword kw
    DeleteKeyword kwId mp -> handleDeleteKeyword kwId mp
    GetPositions kwId mp -> handleGetPositions kwId mp
    ListDropped mp -> handleListDropped mp
    CheckDropped articleId mp -> handleCheckDropped articleId mp
    ListClusters mp -> handleListClusters mp
    CreateCluster kwIds name mp -> handleCreateCluster kwIds name mp
    GetClusterKeywords clusterId -> handleGetClusterKeywords clusterId
    ExtractCompetitor articleId mp -> handleExtractCompetitor articleId mp
    GetCompetitorKeywords articleId mp -> handleGetCompetitorKeywords articleId mp
    CollectKeywords articleId mp -> handleCollectKeywords articleId mp
    RefreshPositions mp -> handleRefreshPositions mp
    GapAnalysis competitorId mp -> handleGapAnalysis competitorId mp
    ExportKeywords mp -> handleExportKeywords mp
    UpdateLabel kwId label mp -> handleUpdateLabel kwId label mp

-- =============================================================================
-- Handlers
-- =============================================================================

-- | GET /api/seo/keywords - List tracked keywords
handleListKeywords :: (AppE es) => Marketplace -> Eff es Value
handleListKeywords mp = do
    -- In real impl: query DB for tracked keywords by marketplace
    let keywords = []
    pure $ encode keywords

-- | POST /api/seo/keywords - Add keyword to tracking
handleAddKeyword :: (AppE es) => SeoKeyword -> Eff es Value
handleAddKeyword kw = do
    -- In real impl: save keyword to DB
    pure $ encode kw

-- | DELETE /api/seo/keywords/:id - Remove keyword
handleDeleteKeyword :: (AppE es) => Int -> Marketplace -> Eff es Value
handleDeleteKeyword kwId mp = do
    -- In real impl: delete keyword from DB
    pure $ encode NoContent

-- | GET /api/seo/positions/:keywordId - Get position history
handleGetPositions :: (AppE es) => Int -> Marketplace -> Eff es Value
handleGetPositions kwId mp = do
    -- In real impl: query position history from DB
    let positions = []
    pure $ encode positions

-- | GET /api/seo/dropped - List dropped keywords
handleListDropped :: (AppE es) => Marketplace -> Eff es Value
handleListDropped mp = do
    -- In real impl: query dropped keywords from DB
    let dropped = []
    pure $ encode dropped

-- | POST /api/seo/dropped/check - Run dropped keyword detection
handleCheckDropped :: (AppE es) => Text -> Marketplace -> Eff es Value
handleCheckDropped articleId mp = do
    -- In real impl: run dropped keyword detection algorithm
    let dropped = []
    pure $ encode dropped

-- | GET /api/seo/clusters - List clusters
handleListClusters :: (AppE es) => Marketplace -> Eff es Value
handleListClusters mp = do
    -- In real impl: query clusters from DB
    let clusters = []
    pure $ encode clusters

-- | POST /api/seo/clusters - Create cluster via AI
handleCreateCluster :: (AppE es) => [Int] -> Text -> Marketplace -> Eff es Value
handleCreateCluster kwIds name mp = do
    -- In real impl: call AI service to create cluster
    let cluster = KeywordCluster
            { clusterId = 0
            , clusterName = name
            , clusterArticleId = ""
            , clusterMarketplace = mp
            , clusterKeywords = []
            , clusterCreatedAt = undefined
            }
    pure $ encode cluster

-- | GET /api/seo/clusters/:id/keywords - Get keywords in cluster
handleGetClusterKeywords :: (AppE es) => Int -> Eff es Value
handleGetClusterKeywords clusterId = do
    -- In real impl: query cluster keywords from DB
    let keywords = []
    pure $ encode keywords

-- | POST /api/seo/competitor - Extract competitor keywords
handleExtractCompetitor :: (AppE es) => Text -> Marketplace -> Eff es Value
handleExtractCompetitor articleId mp = do
    -- In real impl: scrape competitor page and extract keywords
    let result = CompetitorKeywords
            { compId = 0
            , ckArticleId = articleId
            , ckMarketplace = mp
            , ckKeywords = []
            , ckCollectedAt = undefined
            }
    pure $ encode result

-- | GET /api/seo/competitor/:articleId/keywords - Get competitor keywords
handleGetCompetitorKeywords :: (AppE es) => Text -> Marketplace -> Eff es Value
handleGetCompetitorKeywords articleId mp = do
    -- In real impl: query competitor keywords from DB
    let keywords = []
    pure $ encode keywords

-- | POST /api/seo/keywords/collect - Collect all keywords for article
handleCollectKeywords :: (AppE es) => Text -> Marketplace -> Eff es Value
handleCollectKeywords articleId mp = do
    -- In real impl: scrape article page and collect keywords
    let positions = []
    pure $ encode positions

-- | POST /api/seo/refresh - Refresh all positions
handleRefreshPositions :: (AppE es) => Marketplace -> Eff es Value
handleRefreshPositions mp = do
    -- In real impl: fetch fresh positions from marketplace APIs
    let positions = []
    pure $ encode positions

-- | GET /api/seo/gap-analysis - Find keywords competitor has that user doesn't
handleGapAnalysis :: (AppE es) => Text -> Marketplace -> Eff es Value
handleGapAnalysis competitorId mp = do
    -- In real impl: compare user keywords with competitor keywords
    let gaps = []
    pure $ encode gaps

-- | GET /api/seo/export - Export data as CSV
handleExportKeywords :: (AppE es) => Marketplace -> Eff es Value
handleExportKeywords mp = do
    -- In real impl: generate CSV of all keywords for marketplace
    let csv = "keyword,article_id,position,date\n" :: Text
    pure $ encode csv

-- | PUT /api/seo/keywords/:id/label - Update keyword label
handleUpdateLabel :: (AppE es) => Int -> Text -> Marketplace -> Eff es Value
handleUpdateLabel kwId label mp = do
    -- In real impl: update keyword label in DB
    let kw = SeoKeyword
            { skId = kwId
            , skKeyword = ""
            , skArticleId = ""
            , skMarketplace = mp
            , skPosition = Nothing
            , skCreatedAt = undefined
            }
    pure $ encode kw

-- =============================================================================
-- Route Definitions List
-- =============================================================================

-- | All SEO API routes
seoRoutes :: [SEORouteDef]
seoRoutes =
    [ SEOKeywordRoute "GET" "/api/seo/keywords" $ \route -> case route of
        ListKeywords mp -> Just (ListKeywords mp)
        _ -> Nothing
    , SEOKeywordRoute "POST" "/api/seo/keywords" $ \route -> case route of
        AddKeyword kw -> Just (AddKeyword kw)
        _ -> Nothing
    , SEOKeywordRoute "DELETE" "/api/seo/keywords/:id" $ \route -> case route of
        DeleteKeyword kwId mp -> Just (DeleteKeyword kwId mp)
        _ -> Nothing
    , SEOKeywordRoute "GET" "/api/seo/positions/:keywordId" $ \route -> case route of
        GetPositions kwId mp -> Just (GetPositions kwId mp)
        _ -> Nothing
    , SEODroppedRoute "GET" "/api/seo/dropped" $ \route -> case route of
        ListDropped mp -> Just (ListDropped mp)
        _ -> Nothing
    , SEODroppedRoute "POST" "/api/seo/dropped/check" $ \route -> case route of
        CheckDropped articleId mp -> Just (CheckDropped articleId mp)
        _ -> Nothing
    , SEOClusterRoute "GET" "/api/seo/clusters" $ \route -> case route of
        ListClusters mp -> Just (ListClusters mp)
        _ -> Nothing
    , SEOClusterRoute "POST" "/api/seo/clusters" $ \route -> case route of
        CreateCluster kwIds name mp -> Just (CreateCluster kwIds name mp)
        _ -> Nothing
    , SEOClusterRoute "GET" "/api/seo/clusters/:id/keywords" $ \route -> case route of
        GetClusterKeywords clusterId -> Just (GetClusterKeywords clusterId)
        _ -> Nothing
    , SEOCompetitorRoute "POST" "/api/seo/competitor" $ \route -> case route of
        ExtractCompetitor articleId mp -> Just (ExtractCompetitor articleId mp)
        _ -> Nothing
    , SEOCompetitorRoute "GET" "/api/seo/competitor/:articleId/keywords" $ \route -> case route of
        GetCompetitorKeywords articleId mp -> Just (GetCompetitorKeywords articleId mp)
        _ -> Nothing
    , SEOCollectRoute "POST" "/api/seo/keywords/collect" $ \route -> case route of
        CollectKeywords articleId mp -> Just (CollectKeywords articleId mp)
        _ -> Nothing
    , SEORefreshRoute "POST" "/api/seo/refresh" $ \route -> case route of
        RefreshPositions mp -> Just (RefreshPositions mp)
        _ -> Nothing
    , SEOGapRoute "GET" "/api/seo/gap-analysis" $ \route -> case route of
        GapAnalysis competitorId mp -> Just (GapAnalysis competitorId mp)
        _ -> Nothing
    , SEOExportRoute "GET" "/api/seo/export" $ \route -> case route of
        ExportKeywords mp -> Just (ExportKeywords mp)
        _ -> Nothing
    , SEOLabelRoute "PUT" "/api/seo/keywords/:id/label" $ \route -> case route of
        UpdateLabel kwId label mp -> Just (UpdateLabel kwId label mp)
        _ -> Nothing
    ]
