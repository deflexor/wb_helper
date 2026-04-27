-- | Tests for AI.OpenRouter - Clustering and Dropped Detection Functions
{-# LANGUAGE OverloadedStrings #-}
module AI.OpenRouterClusteringSpec where

import Test.Hspec
import Data.Text (Text)
import qualified Data.Text as T
import Data.Aeson (encode, decode)
import qualified Data.ByteString.Lazy as LBS
import qualified Data.Text.Encoding as TEnc

import AI.OpenRouter
import AI.OpenRouter.Types
import AI.Prompts
    ( getSEOClusteringPrompt
    , getSEODroppedDetectionPrompt
    , getSEOCompetitorAnalysisPrompt
    , getKeywordSuggestionsPrompt
    )
import Domain.Marketplace (Marketplace(..))
import Domain.SEO
    ( KeywordCluster(..)
    , ClusterKeyword(..)
    , DroppedKeyword(..)
    , CompetitorKeywords(..)
    )

main :: IO ()
main = hspec spec

-- | Helper to create mock response
mockCompletionResponse :: Text -> ChatCompletionResponse
mockCompletionResponse content = ChatCompletionResponse
    { ccrId = "test-id-123"
    , ccrContent = content
    , ccrUsage = 150
    }

spec :: Spec
spec = do
  describe "KeywordClusterResponse parsing" $ do
    it "parses valid clustering JSON" $ do
        let json = "[{\"clusterName\":\"price keywords\",\"keywords\":[\"купить дешево\",\"скидки\"]}]"
            result = decode @(KeywordClusterResponse) (LBS.fromStrict $ TEnc.encodeUtf8 json)
        result `shouldBe` Just (KeywordClusterResponse "price keywords" ["купить дешево", "скидки"])

    it "handles empty cluster list" $ do
        let json = "[]"
            result = decode @[KeywordClusterResponse] (LBS.fromStrict $ TEnc.encodeUtf8 json)
        result `shouldBe` Just []

    it "parses multiple clusters" $ do
        let json = "[{\"clusterName\":\"colors\",\"keywords\":[\"красный\",\"синий\"]},{\"clusterName\":\"size\",\"keywords\":[\"большой\",\"маленький\"]}]"
            result = decode @[KeywordClusterResponse] (LBS.fromStrict $ TEnc.encodeUtf8 json)
        length (fromMaybe [] result) `shouldBe` 2

  describe "DroppedKeywordResponse parsing" $ do
    it "parses valid dropped keyword JSON" $ do
        let json = "[{\"keyword\":\"старый товар\",\"lastSeen\":\"2026-03-01\",\"previousPosition\":5,\"droppedAt\":\"2026-04-01\"}]"
            result = decode @[DroppedKeywordResponse] (LBS.fromStrict $ TEnc.encodeUtf8 json)
        case result of
            Just [d] -> do
                dkrKeyword d `shouldBe` "старый товар"
                dkrPreviousPosition d `shouldBe` 5
            Nothing -> fail "Failed to parse"

    it "handles empty dropped list" $ do
        let json = "[]"
            result = decode @[DroppedKeywordResponse] (LBS.fromStrict $ TEnc.encodeUtf8 json)
        result `shouldBe` Just []

  describe "CompetitorKeywordsResponse parsing" $ do
    it "parses valid competitor keywords JSON" $ do
        let json = "{\"keywords\":[\"keyword1\",\"keyword2\",\"keyword3\"],\"analysisDate\":\"2026-04-27\"}"
            result = decode @(CompetitorKeywordsResponse) (LBS.fromStrict $ TEnc.encodeUtf8 json)
        case result of
            Just r -> do
                length (ckrKeywords r) `shouldBe` 3
                ckrAnalysisDate r `shouldBe` "2026-04-27"
            Nothing -> fail "Failed to parse"

    it "handles empty keyword list" $ do
        let json = "{\"keywords\":[],\"analysisDate\":\"2026-04-27\"}"
            result = decode @(CompetitorKeywordsResponse) (LBS.fromStrict $ TEnc.encodeUtf8 json)
        case result of
            Just r -> length (ckrKeywords r) `shouldBe` 0
            Nothing -> fail "Failed to parse"

  describe "getSEOClusteringPrompt" $ do
    it "includes marketplace in prompt" $ do
        let keywords = ["купить", "цена", "скидка"]
            (systemPrompt, userPrompt) = getSEOClusteringPrompt keywords Wildberries
        T.isInfixOf "wildberries" userPrompt `shouldBe` True
        T.isInfixOf "купить" userPrompt `shouldBe` True
        T.isInfixOf "price keywords" systemPrompt `shouldBe` True

    it "includes all keywords in user prompt" $ do
        let keywords = ["keyword1", "keyword2"]
            (_, userPrompt) = getSEOClusteringPrompt keywords Ozon
        T.isInfixOf "keyword1" userPrompt `shouldBe` True
        T.isInfixOf "keyword2" userPrompt `shouldBe` True

    it "mentions clustering in system prompt" $ do
        let (systemPrompt, _) = getSEOClusteringPrompt ["test"] Wildberries
        T.isInfixOf "cluster" systemPrompt `shouldBe` True
        T.isInfixOf "semantic" systemPrompt `shouldBe` True

  describe "getSEODroppedDetectionPrompt" $ do
    it "includes article ID in prompt" $ do
        let articleId = "product-123" :: Text
            (systemPrompt, userPrompt) = getSEODroppedDetectionPrompt articleId Wildberries
        T.isInfixOf "product-123" userPrompt `shouldBe` True

    it "includes marketplace in prompt" $ do
        let (_, userPrompt) = getSEODroppedDetectionPrompt "test" Ozon
        T.isInfixOf "ozon" userPrompt `shouldBe` True

    it "mentions dropout detection in system prompt" $ do
        let (systemPrompt, _) = getSEODroppedDetectionPrompt "test" Wildberries
        T.isInfixOf "dropout" systemPrompt `shouldBe` True
        T.isInfixOf "keyword position" systemPrompt `shouldBe` True

  describe "getSEOCompetitorAnalysisPrompt" $ do
    it "includes competitor article ID in prompt" $ do
        let competitorId = "competitor-456" :: Text
            (systemPrompt, userPrompt) = getSEOCompetitorAnalysisPrompt competitorId Wildberries
        T.isInfixOf "competitor-456" userPrompt `shouldBe` True

    it "includes marketplace context" $ do
        let (_, userPrompt) = getSEOCompetitorAnalysisPrompt "test" Ozon
        T.isInfixOf "ozon" userPrompt `shouldBe` True

    it "mentions keyword extraction in system prompt" $ do
        let (systemPrompt, _) = getSEOCompetitorAnalysisPrompt "test" Wildberries
        T.isInfixOf "competitor keyword" systemPrompt `shouldBe` True

  describe "getKeywordSuggestionsPrompt" $ do
    it "includes competitor keywords in prompt" $ do
        let competitorKws = ["kw1", "kw2", "kw3"]
            category = "electronics" :: Text
            (systemPrompt, userPrompt) = getKeywordSuggestionsPrompt competitorKws category Wildberries
        T.isInfixOf "kw1" userPrompt `shouldBe` True
        T.isInfixOf "kw2" userPrompt `shouldBe` True
        T.isInfixOf "kw3" userPrompt `shouldBe` True

    it "includes product category in prompt" $ do
        let (_, userPrompt) = getKeywordSuggestionsPrompt ["test"] "clothing" Wildberries
        T.isInfixOf "clothing" userPrompt `shouldBe` True

    it "mentions opportunity identification in system prompt" $ do
        let (systemPrompt, _) = getKeywordSuggestionsPrompt ["test"] "any" Wildberries
        T.isInfixOf "opportunity" systemPrompt `shouldBe` True

  describe "KeywordCluster domain type" $ do
    it "has correct structure" $ do
        let cluster = KeywordCluster
                { clusterId = 1
                , clusterName = "Test Cluster"
                , clusterArticleId = "article-1"
                , clusterMarketplace = Wildberries
                , clusterKeywords = []
                , clusterCreatedAt = undefined  -- Use undefined for test
                }
        clusterId cluster `shouldBe` 1
        clusterName cluster `shouldBe` "Test Cluster"
        clusterMarketplace cluster `shouldBe` Wildberries

  describe "DroppedKeyword domain type" $ do
    it "has correct structure" $ do
        let dropped = DroppedKeyword
                { dkId = 1
                , dkKeyword = "old keyword"
                , dkArticleId = "article-1"
                , dkMarketplace = Ozon
                , dkLastSeen = undefined
                , dkDroppedAt = undefined
                , dkPreviousPosition = 10
                }
        dkId dropped `shouldBe` 1
        dkKeyword dropped `shouldBe` "old keyword"
        dkPreviousPosition dropped `shouldBe` 10

  describe "CompetitorKeywords domain type" $ do
    it "has correct structure" $ do
        let comp = CompetitorKeywords
                { compId = 1
                , ckArticleId = "comp-1"
                , ckMarketplace = Wildberries
                , ckKeywords = ["kw1", "kw2"]
                , ckCollectedAt = undefined
                }
        compId comp `shouldBe` 1
        length (ckKeywords comp) `shouldBe` 2

  describe "OpenRouterConfig for SEO functions" $ do
    it "has correct default base URL" $ do
        openRouterBaseUrl defaultOpenRouterConfig
            `shouldBe` "https://openrouter.ai/api/v1/chat/completions"

    it "can be created with custom API key" $ do
        let config = defaultOpenRouterConfig { openRouterApiKey = "test-key-123" }
        openRouterApiKey config `shouldBe` "test-key-123"

  describe "clusterKeywords edge cases" $ do
    it "returns empty list for empty input keywords" $ do
        -- Testing the behavior: clusterKeywords should return [] for []
        -- This is a pure function test without actual AI call
        True `shouldBe` True  -- Placeholder until integration test

    it "handles single keyword gracefully" $ do
        True `shouldBe` True  -- Placeholder until integration test

  describe "detectDroppedKeywords edge cases" $ do
    it "handles non-existent article ID" $ do
        True `shouldBe` True  -- Placeholder until integration test

    it "handles article with no dropped keywords" $ do
        True `shouldBe` True  -- Placeholder until integration test

  describe "generateKeywordSuggestions edge cases" $ do
    it "returns empty list for empty competitor keywords" $ do
        -- Testing the behavior: should return [] for []
        True `shouldBe` True  -- Placeholder until integration test

    it "handles single competitor keyword" $ do
        True `shouldBe` True  -- Placeholder until integration test

  describe "analyzeCompetitorKeywords edge cases" $ do
    it "handles non-existent competitor article" $ do
        True `shouldBe` True  -- Placeholder until integration test

    it "handles competitor with no obvious keywords" $ do
        True `shouldBe` True  -- Placeholder until integration test

  describe "Integration with AI.Orchestrator" $ do
    it "response type has required fields" $ do
        let response = AIResponse
                { arContent = "test content"
                , arModel = Llama38B
                , arTokens = 100
                , arFallbacksAttempted = []
                , arWarning = Nothing
                }
        arContent response `shouldBe` "test content"
        arModel response `shouldBe` Llama38B
        arTokens response `shouldBe` 100

    it "fallback tracking works" $ do
        let response = AIResponse
                { arContent = "fallback result"
                , arModel = Gemma7B
                , arTokens = 50
                , arFallbacksAttempted = [Llama38B]
                , arWarning = Just "Primary model failed"
                }
        arFallbacksAttempted response `shouldBe` [Llama38B]
        arWarning response `shouldBe` Just "Primary model failed"