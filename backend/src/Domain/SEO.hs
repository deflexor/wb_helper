-- SEO domain types and pure functions
-- Marketplace-agnostic keyword tracking, clusters, and competitor analysis
module Domain.SEO
    ( Marketplace(..)
    , SeoKeyword(..)
    , KeywordPosition(..)
    , DroppedKeyword(..)
    , KeywordCluster(..)
    , ClusterKeyword(..)
    , CompetitorKeywords(..)
    , isKeywordDropped
    , positionChange
    , filterByMarketplace
    , groupBySimilarity
    ) where

import Data.Text (Text)
import Data.Time (UTCTime, Day)
import Data.List (groupBy)
import Domain.Marketplace (Marketplace(..))

-- | Keyword tracking data
data SeoKeyword = SeoKeyword
    { skId          :: Int
    , skKeyword     :: Text
    , skArticleId   :: Text
    , skMarketplace :: Marketplace
    , skPosition    :: Maybe Int
    , skCreatedAt   :: UTCTime
    } deriving (Eq, Show)

-- | Keyword position history
data KeywordPosition = KeywordPosition
    { kpId          :: Int
    , kpKeyword     :: Text
    , kpArticleId   :: Text
    , kpMarketplace :: Marketplace
    , kpPosition    :: Int
    , kpDate        :: Day
    } deriving (Eq, Show)

-- | Dropped keyword detection
data DroppedKeyword = DroppedKeyword
    { dkId             :: Int
    , dkKeyword        :: Text
    , dkArticleId      :: Text
    , dkMarketplace    :: Marketplace
    , dkLastSeen       :: Day
    , dkDroppedAt      :: Day
    , dkPreviousPosition :: Int
    } deriving (Eq, Show)

-- | Semantic keyword cluster
data KeywordCluster = KeywordCluster
    { clusterId         :: Int
    , clusterName       :: Text
    , clusterArticleId  :: Text
    , clusterMarketplace :: Marketplace
    , clusterKeywords   :: [ClusterKeyword]
    , clusterCreatedAt  :: UTCTime
    } deriving (Eq, Show)

-- | Individual keyword within a cluster
data ClusterKeyword = ClusterKeyword
    { ckId             :: Int
    , ckClusterId      :: Int
    , ckKeyword        :: Text
    , ckSimilarityScore :: Double
    } deriving (Eq, Show)

-- | Competitor keyword analysis
data CompetitorKeywords = CompetitorKeywords
    { compId       :: Int
    , ckArticleId   :: Text
    , ckMarketplace :: Marketplace
    , ckKeywords    :: [Text]
    , ckCollectedAt :: UTCTime
    } deriving (Eq, Show)

-- | Detect if keyword position dropped significantly
-- Drop is defined as moving more than threshold positions down
isKeywordDropped :: Int -> Int -> Bool
isKeywordDropped oldPos newPos = newPos > oldPos + 10

-- | Calculate position change between two measurements
-- Positive result means improvement (moved up in rankings)
-- Zero means no change or invalid input
positionChange :: Maybe Int -> Maybe Int -> Int
positionChange (Just old) (Just new) = old - new
positionChange _ _ = 0

-- | Filter keywords by marketplace
filterByMarketplace :: Marketplace -> [SeoKeyword] -> [SeoKeyword]
filterByMarketplace mp = filter ((== mp) . skMarketplace)

-- | Group keywords into clusters by similarity threshold
-- Keywords within threshold distance of each other form a cluster
groupBySimilarity :: Double -> [ClusterKeyword] -> [[ClusterKeyword]]
groupBySimilarity threshold = groupBy (\a b -> abs (ckSimilarityScore a - ckSimilarityScore b) < threshold)