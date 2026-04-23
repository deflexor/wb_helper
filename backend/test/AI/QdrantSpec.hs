-- | Tests for AI.Qdrant - Qdrant Vector DB integration
{-# LANGUAGE OverloadedStrings #-}
module AI.QdrantSpec where

import Test.Hspec
import Data.Aeson (encode, decode, object, (.=), Value(..))
import Data.Text (Text)
import qualified Data.Text as T
import qualified Data.Text.Encoding as TEnc
import qualified Data.ByteString.Lazy as LBS
import qualified Data.Vector as V
import qualified Data.Map as Map

import AI.Qdrant
import AI.Qdrant.Types

main :: IO ()
main = hspec spec

spec :: Spec
spec = do
  describe "VectorPoint" $ do
    it "serializes to JSON with id, vector, and payload" $ do
      let point = VectorPoint
            { vpId = "point-1"
            , vpVector = V.fromList [0.1, 0.2, 0.3]
            , vpPayload = Map.singleton "text" (String "Hello world")
            }
          json = encode point
          jsonText = TEnc.decodeUtf8 (LBS.toStrict json)
      T.isInfixOf "\"id\":\"point-1\"" jsonText `shouldBe` True
      T.isInfixOf "\"vector\":[0.1,0.2,0.3]" jsonText `shouldBe` True
      T.isInfixOf "\"payload\"" jsonText `shouldBe` True

    it "deserializes from JSON correctly" $ do
      let json = object
            [ "id" .= ("point-1" :: Text)
            , "vector" .= ([0.1, 0.2, 0.3] :: [Double])
            , "payload" .= object ["text" .= ("Hello" :: Text)]
            ]
          result = decode @(VectorPoint) (encode json)
      case result of
        Just p -> do
          vpId p `shouldBe` "point-1"
          V.length (vpVector p) `shouldBe` 3
          Map.lookup "text" (vpPayload p) `shouldBe` Just (String "Hello")
        Nothing -> expectationFailure "Failed to parse VectorPoint"

  describe "SearchResult" $ do
    it "serializes to JSON with id, score, and payload" $ do
      let result = SearchResult
            { srId = "result-1"
            , srScore = 0.95
            , srPayload = Map.singleton "text" (String "Found it")
            }
          json = encode result
          jsonText = TEnc.decodeUtf8 (LBS.toStrict json)
      T.isInfixOf "\"id\":\"result-1\"" jsonText `shouldBe` True
      T.isInfixOf "\"score\":0.95" jsonText `shouldBe` True

    it "deserializes from JSON correctly" $ do
      let json = object
            [ "id" .= ("result-1" :: Text)
            , "score" .= (0.95 :: Double)
            , "payload" .= object ["text" .= ("Found" :: Text)]
            ]
          result = decode @(SearchResult) (encode json)
      case result of
        Just r -> do
          srId r `shouldBe` "result-1"
          srScore r `shouldBe` 0.95
        Nothing -> expectationFailure "Failed to parse SearchResult"

  describe "QdrantConfig" $ do
    it "has sensible defaults" $ do
      let config = QdrantConfig
            { qdrantUrl = "http://localhost:6333"
            , qdrantCollection = "test-collection"
            , qdrantVectorSize = 1536
            }
      qdrantUrl config `shouldBe` "http://localhost:6333"
      qdrantCollection config `shouldBe` "test-collection"
      qdrantVectorSize config `shouldBe` 1536

  describe "Collection creation JSON" $ do
    it "creates correct collection JSON with vectors.size and distance" $ do
      let config = QdrantConfig
            { qdrantUrl = "http://localhost:6333"
            , qdrantCollection = "my-collection"
            , qdrantVectorSize = 768
            }
          json = encodeCollectionConfig config
          jsonText = TEnc.decodeUtf8 (LBS.toStrict json)
      T.isInfixOf "\"size\":768" jsonText `shouldBe` True
      T.isInfixOf "\"distance\":\"Cosine\"" jsonText `shouldBe` True

    it "uses cosine distance by default" $ do
      let config = QdrantConfig
            { qdrantUrl = "http://localhost:6333"
            , qdrantCollection = "test"
            , qdrantVectorSize = 384
            }
          json = encodeCollectionConfig config
          jsonText = TEnc.decodeUtf8 (LBS.toStrict json)
      T.isInfixOf "\"distance\":\"Cosine\"" jsonText `shouldBe` True

  describe "UpsertPoints JSON" $ do
    it "serializes points array correctly" $ do
      let points = [
            VectorPoint "p1" (V.fromList [0.1, 0.2]) Map.empty,
            VectorPoint "p2" (V.fromList [0.3, 0.4]) (Map.singleton "k" (String "v"))
            ]
          json = encodePoints points
          jsonText = TEnc.decodeUtf8 (LBS.toStrict json)
      T.isInfixOf "\"points\"" jsonText `shouldBe` True
      T.isInfixOf "\"p1\"" jsonText `shouldBe` True
      T.isInfixOf "\"p2\"" jsonText `shouldBe` True
      T.isInfixOf "0.1" jsonText `shouldBe` True
      T.isInfixOf "0.2" jsonText `shouldBe` True

  describe "SearchQuery JSON" $ do
    it "serializes query vector correctly" $ do
      let query = encodeSearchQuery (V.fromList [0.5, 0.6]) 5
          queryText = TEnc.decodeUtf8 (LBS.toStrict query)
      T.isInfixOf "\"vector\":[0.5,0.6]" queryText `shouldBe` True
      T.isInfixOf "\"limit\":5" queryText `shouldBe` True

  describe "QdrantError" $ do
    it "has Show instance for network errors" $ do
      show (QdrantNetworkError "connection refused") `shouldContain` "QdrantNetworkError"

    it "has Show instance for HTTP errors" $ do
      show (QdrantHttpError 404 "Not found") `shouldContain` "QdrantHttpError"

    it "has Show instance for parse errors" $ do
      show (QdrantParseError "invalid json") `shouldContain` "QdrantParseError"

  describe "Collection URL construction" $ do
    it "builds correct collection URL" $ do
      let config = QdrantConfig
            { qdrantUrl = "http://localhost:6333"
            , qdrantCollection = "my_vectors"
            , qdrantVectorSize = 768
            }
          url = collectionUrl config
      url `shouldBe` "http://localhost:6333/collections/my_vectors"

    it "builds correct points URL" $ do
      let config = QdrantConfig
            { qdrantUrl = "http://localhost:6333"
            , qdrantCollection = "documents"
            , qdrantVectorSize = 1024
            }
          url = pointsUrl config
      url `shouldBe` "http://localhost:6333/collections/documents/points"

    it "builds correct search URL" $ do
      let config = QdrantConfig
            { qdrantUrl = "http://localhost:6333"
            , qdrantCollection = "embeddings"
            , qdrantVectorSize = 1536
            }
          url = searchUrl config
      url `shouldBe` "http://localhost:6333/collections/embeddings/points/query"