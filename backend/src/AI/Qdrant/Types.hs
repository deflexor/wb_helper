{-# LANGUAGE DeriveGeneric #-}
-- | Qdrant Vector DB Types
module AI.Qdrant.Types
  ( VectorPoint(..)
  , SearchResult(..)
  , QdrantConfig(..)
  , QdrantError(..)
  ) where

import Data.Aeson (FromJSON(..), ToJSON(..), Value, object, (.=), (.:), withObject, Key)
import qualified Data.Aeson.Key as Key
import Data.String (fromString)
import Data.Text (Text)
import Data.Vector (Vector)
import qualified Data.Vector as V
import Data.Map (Map)
import qualified Data.Map as Map
import GHC.Generics (Generic)

-- | Vector point with payload for Qdrant
data VectorPoint = VectorPoint
  { vpId :: Text           -- ^ Unique point ID
  , vpVector :: Vector Float  -- ^ Embedding vector
  , vpPayload :: Map Text Value  -- ^ Metadata payload
  } deriving (Show, Eq)

instance ToJSON VectorPoint where
  toJSON vp = object
    [ fromString "id" .= vpId vp
    , fromString "vector" .= V.toList (vpVector vp)
    , fromString "payload" .= vpPayload vp
    ]

instance FromJSON VectorPoint where
  parseJSON = withObject "VectorPoint" $ \obj ->
    VectorPoint <$> obj .: fromString "id"
                <*> obj .: fromString "vector"
                <*> obj .: fromString "payload"

-- | Search result from Qdrant
data SearchResult = SearchResult
  { srId :: Text           -- ^ Point ID
  , srScore :: Float       -- ^ Similarity score
  , srPayload :: Map Text Value  -- ^ Stored payload
  } deriving (Show, Eq)

instance ToJSON SearchResult where
  toJSON sr = object
    [ fromString "id" .= srId sr
    , fromString "score" .= srScore sr
    , fromString "payload" .= srPayload sr
    ]

instance FromJSON SearchResult where
  parseJSON = withObject "SearchResult" $ \obj ->
    SearchResult <$> obj .: fromString "id"
                 <*> obj .: fromString "score"
                 <*> obj .: fromString "payload"

-- | Qdrant configuration
data QdrantConfig = QdrantConfig
  { qdrantUrl :: Text      -- ^ Qdrant server URL (e.g., "http://localhost:6333")
  , qdrantCollection :: Text  -- ^ Collection name
  , qdrantVectorSize :: Int  -- ^ Embedding dimension
  } deriving (Show, Eq)

instance ToJSON QdrantConfig where
  toJSON cfg = object
    [ fromString "url" .= qdrantUrl cfg
    , fromString "collection" .= qdrantCollection cfg
    , fromString "vectorSize" .= qdrantVectorSize cfg
    ]

instance FromJSON QdrantConfig where
  parseJSON = withObject "QdrantConfig" $ \obj ->
    QdrantConfig <$> obj .: fromString "url"
                 <*> obj .: fromString "collection"
                 <*> obj .: fromString "vectorSize"

-- | Qdrant-specific errors
data QdrantError
  = QdrantNetworkError String     -- ^ Connection failures
  | QdrantHttpError Int Text      -- ^ HTTP error with status and message
  | QdrantParseError String       -- ^ JSON parsing errors
  | QdrantConfigMissing String    -- ^ Missing configuration
  deriving (Show, Eq)