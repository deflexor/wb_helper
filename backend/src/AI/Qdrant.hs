-- | Qdrant Vector DB Integration
--
-- Uses REST API via http-client (no official Haskell client available)
{-# LANGUAGE OverloadedStrings #-}
module AI.Qdrant
  ( module AI.Qdrant.Types
  , QdrantConfig(..)
  , VectorPoint(..)
  , SearchResult(..)
  -- * Collection management
  , createCollection
  , deleteCollection
  -- * Encoding functions (exported for testing)
  , encodeCollectionConfig
  , encodePoints
  , encodeSearchQuery
  -- * URL helpers (exported for testing)
  , collectionUrl
  , pointsUrl
  , searchUrl
  ) where

import Control.Exception (catch, IOException, SomeException)
import Control.Monad (when)
import Data.Aeson (encode, decode, Value, object, (.=))
import Data.ByteString.Lazy qualified as LBS
import Data.Text (Text)
import Data.Text qualified as T
import Data.Vector (Vector)
import Data.Vector qualified as V
import Network.HTTP.Client (Request, Response(..), httpLbs, parseRequest, HttpException(..))
import Network.HTTP.Client qualified as HTTP
import Network.HTTP.Types (statusCode)

import Effect.AppEffect (AppE, liftIO, Eff)
import Effect.Error (AppError(..), throwError)

import AI.Qdrant.Types

-- | Build URL for collection endpoint
collectionUrl :: QdrantConfig -> Text
collectionUrl config = qdrantUrl config <> "/collections/" <> qdrantCollection config

-- | Build URL for points endpoint
pointsUrl :: QdrantConfig -> Text
pointsUrl config = collectionUrl config <> "/points"

-- | Build URL for search endpoint
searchUrl :: QdrantConfig -> Text
searchUrl config = collectionUrl config <> "/points/query"

-- | Encode collection configuration for creation
encodeCollectionConfig :: QdrantConfig -> LBS.ByteString
encodeCollectionConfig config = encode $ object
  [ "vectors" .= object
      [ "size" .= qdrantVectorSize config
      , "distance" .= ("Cosine" :: Text)
      ]
  ]

-- | Encode points for upsert request
encodePoints :: [VectorPoint] -> LBS.ByteString
encodePoints points = encode $ object ["points" .= points]

-- | Encode search query
encodeSearchQuery :: V.Vector Float -> Int -> LBS.ByteString
encodeSearchQuery vector limit = encode $ object
  [ "vector" .= V.toList vector
  , "limit" .= limit
  ]

-- | Create a new collection in Qdrant
createCollection :: (AppE es) => QdrantConfig -> Eff es ()
createCollection config = do
  when (T.null (qdrantUrl config)) $
    throwError $ ConfigurationError "Qdrant URL is required"
  when (T.null (qdrantCollection config)) $
    throwError $ ConfigurationError "Qdrant collection name is required"
  when (qdrantVectorSize config <= 0) $
    throwError $ ConfigurationError "Vector size must be positive"

  let url = T.unpack $ collectionUrl config
      body = encodeCollectionConfig config

  result <- liftIO $ catchAction $ do
    req <- parseRequest url
    let req' = req
          { HTTP.method = "PUT"
          , HTTP.requestBody = HTTP.RequestBodyLBS body
          , HTTP.requestHeaders = []
          }
    httpLbs req' =<< HTTP.newManager HTTP.defaultManagerSettings

  case result of
    Right resp
      | statusCode (HTTP.responseStatus resp) >= 200
       && statusCode (HTTP.responseStatus resp) < 300 -> pure ()
      | otherwise -> throwError $ ExternalServiceError $
          T.unpack $ T.concat [T.pack "Failed to create collection: ", T.pack (show (statusCode (HTTP.responseStatus resp)))]
    Left errMsg -> throwError $ ExternalServiceError $ T.unpack errMsg

-- | Delete a collection from Qdrant
deleteCollection :: (AppE es) => QdrantConfig -> Eff es ()
deleteCollection config = do
  let url = T.unpack $ collectionUrl config

  result <- liftIO $ catchAction $ do
    req <- parseRequest url
    let req' = req
          { HTTP.method = "DELETE"
          , HTTP.requestHeaders = []
          }
    httpLbs req' =<< HTTP.newManager HTTP.defaultManagerSettings

  case result of
    Right resp
      | statusCode (HTTP.responseStatus resp) >= 200
       && statusCode (HTTP.responseStatus resp) < 300 -> pure ()
      | otherwise -> throwError $ ExternalServiceError $
          T.unpack $ T.concat [T.pack "Failed to delete collection: ", T.pack (show (statusCode (HTTP.responseStatus resp)))]
    Left errMsg -> throwError $ ExternalServiceError $ T.unpack errMsg

-- | Upsert points to Qdrant collection
upsertPoints :: (AppE es) => QdrantConfig -> [VectorPoint] -> Eff es ()
upsertPoints config points = do
  let url = T.unpack $ pointsUrl config
      body = encode $ object ["points" .= points]

  result <- liftIO $ catchAction $ do
    req <- parseRequest url
    let req' = req
          { HTTP.method = "PUT"
          , HTTP.requestBody = HTTP.RequestBodyLBS body
          , HTTP.requestHeaders = [("Content-Type", "application/json")]
          }
    httpLbs req' =<< HTTP.newManager HTTP.defaultManagerSettings

  case result of
    Right resp
      | statusCode (HTTP.responseStatus resp) >= 200
       && statusCode (HTTP.responseStatus resp) < 300 -> pure ()
      | otherwise -> throwError $ ExternalServiceError $
          T.unpack $ T.concat [T.pack "Failed to upsert points: ", T.pack (show (statusCode (HTTP.responseStatus resp)))]
    Left errMsg -> throwError $ ExternalServiceError $ T.unpack errMsg

-- | Search for similar points in Qdrant collection
searchPoints :: (AppE es) => QdrantConfig -> [Float] -> Int -> Eff es [SearchResult]
searchPoints config vector limit = do
  let url = T.unpack $ searchUrl config
      body = encode $ object
        [ "vector" .= vector
        , "limit" .= limit
        ]

  result <- liftIO $ catchAction $ do
    req <- parseRequest url
    let req' = req
          { HTTP.method = "POST"
          , HTTP.requestBody = HTTP.RequestBodyLBS body
          , HTTP.requestHeaders = [("Content-Type", "application/json")]
          }
    httpLbs req' =<< HTTP.newManager HTTP.defaultManagerSettings

  case result of
    Right resp
      | statusCode (HTTP.responseStatus resp) >= 200
       && statusCode (HTTP.responseStatus resp) < 300 -> do
          case decode (HTTP.responseBody resp) of
            Just results -> pure results
            Nothing -> throwError $ ExternalServiceError "Failed to parse search results"
      | otherwise -> throwError $ ExternalServiceError $
          T.unpack $ T.concat [T.pack "Failed to search points: ", T.pack (show (statusCode (HTTP.responseStatus resp)))]
    Left errMsg -> throwError $ ExternalServiceError $ T.unpack errMsg

-- | Helper to catch HTTP exceptions and convert to Either
catchAction :: IO (Response LBS.ByteString) -> IO (Either Text (Response LBS.ByteString))
catchAction action =
  catch (fmap Right action) $ \(e :: HttpException) -> pure $ Left $ T.pack (show e)
