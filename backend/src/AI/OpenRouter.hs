-- | OpenRouter API Client
{-# LANGUAGE OverloadedStrings #-}
module AI.OpenRouter
  ( module AI.OpenRouter.Types
  , OpenRouterConfig(..)
  , defaultOpenRouterConfig
  , buildOpenRouterRequest
  , callOpenRouter
  , OpenRouterError(..)
    -- * SEO AI Functions
  , clusterKeywordsBySemanticSimilarity
  , detectDroppedKeywords
  , generateKeywordSuggestions
  , analyzeCompetitorKeywords
  ) where

import Control.Concurrent (threadDelay)
import Control.Exception (try, SomeException, fromException)
import Data.ByteString (ByteString)
import Data.ByteString qualified as BS
import Data.ByteString.Lazy qualified as LBS
import Data.Text (Text)
import Data.Text qualified as T
import Data.Text.Encoding qualified as TEnc
import Data.Aeson (encode, decode, FromJSON(..), (.:), (.:?), (.=), object, withObject)
import Data.Aeson qualified as A
import Network.HTTP.Client (Request, Response(..), HttpException(..), httpLbs, parseRequest, RequestBody(RequestBodyLBS), requestHeaders)
import Network.HTTP.Client qualified as HTTP
import Network.HTTP.Types (statusCode)
import Control.Monad (when, forM, zipWithM)
import System.Random (randomRIO)
import Data.CaseInsensitive qualified as CI
import Data.CaseInsensitive (CI)
import Data.Time (Day, UTCTime, getCurrentTime, utctDay)
import Data.List (intersperse)
import Data.Maybe (fromMaybe)
import Text.Read (readMaybe)

import Effect.AppEffect (AppE, liftIO, Eff)
import Effect.Error (AppError(..), throwError)
import AI.OpenRouter.Types
import Infra.Retry (RetryConfig(..), defaultRetryConfig, applyJitter)
import AI.ModelRouter (selectModel, getModelId, AIModel(..), ModelConfig(..), getFallbacks)
import AI.CircuitBreaker (CircuitBreaker)
import AI.Prompts
    ( ToolType(..)
    , TemplateContext(..)
    , PromptTemplate(..)
    , renderTemplate
    , getSEOClusteringPrompt
    , getSEODroppedDetectionPrompt
    , getSEOCompetitorAnalysisPrompt
    , getKeywordSuggestionsPrompt
    )
import Auth.JWT (Plan(..))
import Domain.Marketplace (Marketplace(..), marketplaceToText)
import Domain.SEO
    ( KeywordCluster(..)
    , ClusterKeyword(..)
    , DroppedKeyword(..)
    , CompetitorKeywords(..)
    )

-- | SEO AI Response type (local to avoid circular dependency with AI.Orchestrator)
data SEOResponse = SEOResponse
    { seoContent :: Text
    , seoModel :: AIModel
    , seoTokens :: Int
    , seoFallbacksAttempted :: [AIModel]
    , seoWarning :: Maybe Text
    } deriving (Show, Eq)

-- | Alias for clarity when returning multiple clusters
type KeywordClusters = [KeywordCluster]

data OpenRouterError
  = OpenRouterNetworkError String
  | OpenRouterHttpError Int Text
  | OpenRouterPseoseError String
  | OpenRouterConfigMissing String
  deriving (Show, Eq)

-- | Build an HTTP request for OpenRouter API
-- | Build an HTTP request for OpenRouter API
buildOpenRouterRequest :: OpenRouterConfig -> ChatCompletionRequest -> Request
buildOpenRouterRequest config req = HTTP.parseRequest_ url
  where
    url = T.unpack $ openRouterBaseUrl config
    reqBody = RequestBodyLBS (encode req)
    apiKeyText = openRouterApiKey config
    apiKeyBs = TEnc.encodeUtf8 apiKeyText
    bearerBs = BS.append (TEnc.encodeUtf8 (T.pack "Bearer ")) apiKeyBs

    req' = HTTP.parseRequest_ url
    reqWithBody = req'
      { HTTP.requestBody = reqBody
      , HTTP.requestHeaders = 
          [ (CI.mk (TEnc.encodeUtf8 (T.pack "Authorization")), bearerBs)
          , (CI.mk (TEnc.encodeUtf8 (T.pack "Content-Type")), TEnc.encodeUtf8 (T.pack "application/json"))
          ]
      }

-- | Check if an HttpException is retryable
isRetryable :: SomeException -> Bool
isRetryable _ = True  -- Simplified: retry all exceptions

callOpenRouter
  :: (AppE es)
  => OpenRouterConfig
  -> ChatCompletionRequest
  -> Eff es (Either AppError ChatCompletionResponse)
callOpenRouter config req = do
  when (T.null (openRouterApiKey config)) $
    throwError $ ExternalServiceError "OpenRouter API key is missing"

  let httpReq = buildOpenRouterRequest config req
  result <- sendWithRetry defaultRetryConfig httpReq

  case result of
    Left ex ->
      throwError $ ExternalServiceError $ T.unpack $ T.concat [T.pack "OpenRouter request failed: ", T.pack (show ex)]
    Right response -> do
      case decode (HTTP.responseBody response) of
        Just resp -> pure $ Right resp
        Nothing -> throwError $ ExternalServiceError "Failed to parse OpenRouter response"

sendWithRetry :: (AppE es) => RetryConfig -> Request -> Eff es (Either SomeException (Response LBS.ByteString))
sendWithRetry config req = do
  manager <- liftIO $ HTTP.newManager HTTP.defaultManagerSettings
  go config manager 0
  where
    go cfg mgr attempt = do
      result <- liftIO $ try $ HTTP.httpLbs req mgr
      case result of
        Right resp -> pure $ Right resp
        Left ex
          | isRetryable ex && attempt < rcMaxRetries cfg -> do
              let delay = rcBaseDelay cfg * (2 ^ attempt)
              jittered <- liftIO $ applyJitter delay (rcJitter cfg)
              liftIO $ threadDelay jittered
              go cfg mgr (attempt + 1)
          | otherwise -> pure $ Left ex

-- | Response type for keyword clustering
data KeywordClusterResponse = KeywordClusterResponse
    { kcrClusterName :: Text
    , kcrKeywords    :: [Text]
    } deriving (Show, Eq)

instance FromJSON KeywordClusterResponse where
    parseJSON = A.withObject "KeywordClusterResponse" $ \obj ->
        KeywordClusterResponse
            <$> obj .: "clusterName"
            <*> obj .: "keywords"

-- | Response type for dropped keywords
data DroppedKeywordResponse = DroppedKeywordResponse
    { dkrKeyword          :: Text
    , dkrLastSeen         :: Text
    , dkrPreviousPosition :: Int
    , dkrDroppedAt        :: Text
    } deriving (Show, Eq)

instance FromJSON DroppedKeywordResponse where
    parseJSON = A.withObject "DroppedKeywordResponse" $ \obj ->
        DroppedKeywordResponse
            <$> obj .: "keyword"
            <*> obj .: "lastSeen"
            <*> obj .: "previousPosition"
            <*> obj .: "droppedAt"

-- | Response type for competitor keywords
data CompetitorKeywordsResponse = CompetitorKeywordsResponse
    { ckrKeywords      :: [Text]
    , ckrAnalysisDate   :: Text
    } deriving (Show, Eq)

instance FromJSON CompetitorKeywordsResponse where
    parseJSON = A.withObject "CompetitorKeywordsResponse" $ \obj ->
        CompetitorKeywordsResponse
            <$> obj .: "keywords"
            <*> obj .: "analysisDate"

-- | Pseose JSON seoray of Text from AI response
parseKeywordList :: Text -> Either Text [Text]
parseKeywordList content = case decode (LBS.fromStrict $ TEnc.encodeUtf8 content) of
    Just (vals :: [Text]) -> Right vals
    Nothing -> Left $ T.concat ["Failed to parse keyword list from: ", content]

-- | Pseose clustering response
parseClusteringResponse :: Text -> Either Text [KeywordClusterResponse]
parseClusteringResponse content = case decode (LBS.fromStrict $ TEnc.encodeUtf8 content) of
    Just (clusters :: [KeywordClusterResponse]) -> Right clusters
    Nothing -> Left $ T.concat ["Failed to parse clustering response from: ", content]

-- | Pseose dropped keywords response
parseDroppedResponse :: Text -> Either Text [DroppedKeywordResponse]
parseDroppedResponse content = case decode (LBS.fromStrict $ TEnc.encodeUtf8 content) of
    Just (dropped :: [DroppedKeywordResponse]) -> Right dropped
    Nothing -> Left $ T.concat ["Failed to parse dropped keywords response from: ", content]

-- | Pseose competitor keywords response
parseCompetitorResponse :: Text -> Either Text CompetitorKeywordsResponse
parseCompetitorResponse content = case decode (LBS.fromStrict $ TEnc.encodeUtf8 content) of
    Just resp -> Right resp
    Nothing -> Left $ T.concat ["Failed to parse competitor keywords response from: ", content]

-- | Cluster keywords by semantic similseoity using AI
--
-- Takes a list of keywords and groups them into semantically similseo clusters
-- for targeteded SEO optimization on a specific marketplace.
clusterKeywordsBySemanticSimilarity
    :: (AppE es)
    => [Text]              -- ^ input keywords
    -> Marketplace         -- ^ marketplace context
    -> Plan                -- ^ user plan for model selection
    -> OpenRouterConfig    -- ^ OpenRouter config
    -> Eff es [KeywordCluster]  -- ^ grouped clusters
clusterKeywordsBySemanticSimilarity [] _ _ _ = pure []
clusterKeywordsBySemanticSimilarity keywords marketplace plan config = do
    let (systemPrompt, userPrompt) = getSEOClusteringPrompt keywords marketplace
        modelConfig = selectModel plan
        allModels = mcPrimary modelConfig : mcFallbacks modelConfig

    -- Use orchestrateAI with fallback chain
    response <- orchestrateSEOWithModels allModels systemPrompt userPrompt config

    case parseClusteringResponse (seoContent response) of
        Left err -> throwError $ ExternalServiceError $ T.unpack err
        Right clusters -> do
            now <- liftIO getCurrentTime
            -- Convert AI response to domain KeywordCluster
            let domainClusters = zipWith (\i c -> KeywordCluster
                    { clusterId = i
                    , clusterName = kcrClusterName c
                    , clusterArticleId = ""  -- Set by caller
                    , clusterMarketplace = marketplace
                    , clusterKeywords = map (\(idx, kw) -> ClusterKeyword
                        { ckId = i * 1000 + idx
                        , ckClusterId = i
                        , ckKeyword = kw
                        , ckSimilarityScore = 1.0  -- AI-assigned, placeholder
                        }) (zip [0..] (kcrKeywords c))
                    , clusterCreatedAt = now
                    }) [0..] clusters
            pure domainClusters

-- | Orchestrate AI call with specific model chain
orchestrateSEOWithModels
    :: (AppE es)
    => [AIModel]          -- ^ models to try in order
    -> Text               -- ^ system prompt
    -> Text               -- ^ user prompt
    -> OpenRouterConfig    -- ^ config
    -> Eff es SEOResponse
orchestrateSEOWithModels [] _ _ _ = throwError $ ExternalServiceError "No AI models available"
orchestrateSEOWithModels (model:restModels) systemPrompt userMessage config = do
    let modelId = getModelId model
        req = ChatCompletionRequest
            { ccrModel = modelId
            , ccrMessages =
                [ ChatMessage "system" systemPrompt
                , ChatMessage "user" userMessage
                ]
            , ccrTemperature = 0.7
            , ccrMaxTokens = 1000
            }
    result <- callOpenRouter config req

    case result of
        Right resp -> pure $ SEOResponse
            { seoContent = ccrContent resp
            , seoModel = model
            , seoTokens = ccrUsage resp
            , seoFallbacksAttempted = []
            , seoWarning = Nothing
            }
        Left err -> do
            case restModels of
                [] -> throwError err
                _ -> do
                    nextResp <- orchestrateSEOWithModels restModels systemPrompt userMessage config
                    pure $ nextResp
                        { seoFallbacksAttempted = model : seoFallbacksAttempted nextResp
                        }

-- | Detect dropped keywords using historical analysis
--
-- Compseoes current positions with historical data to find lost traffic
-- on a specific marketplace for a given article/product.
detectDroppedKeywords
    :: (AppE es)
    => Text              -- ^ article/product ID
    -> Marketplace      -- ^ marketplace context
    -> Plan              -- ^ user plan for model selection
    -> OpenRouterConfig  -- ^ OpenRouter config
    -> Eff es [DroppedKeyword]
detectDroppedKeywords articleId marketplace plan config = do
    let (systemPrompt, userPrompt) = getSEODroppedDetectionPrompt articleId marketplace
        modelConfig = selectModel plan
        allModels = mcPrimary modelConfig : mcFallbacks modelConfig

    response <- orchestrateSEOWithModels allModels systemPrompt userPrompt config

    case parseDroppedResponse (seoContent response) of
        Left err -> throwError $ ExternalServiceError $ T.unpack err
        Right dropped -> do
            now <- liftIO getCurrentTime
            -- Convert AI response to domain DroppedKeyword
            let domainDropped = zipWith (\i d -> DroppedKeyword
                    { dkId = i
                    , dkKeyword = dkrKeyword d
                    , dkArticleId = articleId
                    , dkMarketplace = marketplace
                    , dkLastSeen = parseDateField (dkrLastSeen d) now
                    , dkDroppedAt = parseDateField (dkrDroppedAt d) now
                    , dkPreviousPosition = dkrPreviousPosition d
                    }) [0..] dropped
            pure domainDropped

parseDateField :: Text -> UTCTime -> Day
parseDateField t fallback = case readMaybe (T.unpack t) of
    Just d -> d
    Nothing -> utctDay fallback

-- | Generate keyword suggestions based on competitor analysis
--
-- Analyzes competitor keywords and suggests new opportunities
-- for a specific product category on a given marketplace.
generateKeywordSuggestions
    :: (AppE es)
    => [Text]            -- ^ competitor keywords
    -> Text              -- ^ product category
    -> Marketplace       -- ^ marketplace context
    -> Plan              -- ^ user plan for model selection
    -> OpenRouterConfig  -- ^ OpenRouter config
    -> Eff es [Text]     -- ^ suggested new keywords
generateKeywordSuggestions [] _ _ _ _ = pure []
generateKeywordSuggestions competitorKeywords category marketplace plan config = do
    let (systemPrompt, userPrompt) = getKeywordSuggestionsPrompt competitorKeywords category marketplace
        modelConfig = selectModel plan
        allModels = mcPrimary modelConfig : mcFallbacks modelConfig

    response <- orchestrateSEOWithModels allModels systemPrompt userPrompt config

    case parseKeywordList (seoContent response) of
        Left err -> throwError $ ExternalServiceError $ T.unpack err
        Right suggestions -> pure suggestions

-- | Extract and analyze competitor keywords
--
-- Analyzes a competitor's article/product to extract keywords
-- they seoe likely ranking for on a specific marketplace.
analyzeCompetitorKeywords
    :: (AppE es)
    => Text              -- ^ competitor article/product ID
    -> Marketplace       -- ^ marketplace context
    -> Plan              -- ^ user plan for model selection
    -> OpenRouterConfig  -- ^ OpenRouter config
    -> Eff es CompetitorKeywords
analyzeCompetitorKeywords competitorArticleId marketplace plan config = do
    let (systemPrompt, userPrompt) = getSEOCompetitorAnalysisPrompt competitorArticleId marketplace
        modelConfig = selectModel plan
        allModels = mcPrimary modelConfig : mcFallbacks modelConfig

    response <- orchestrateSEOWithModels allModels systemPrompt userPrompt config

    case parseCompetitorResponse (seoContent response) of
        Left err -> throwError $ ExternalServiceError $ T.unpack err
        Right competitorResult -> do
            now <- liftIO getCurrentTime
            pure CompetitorKeywords
                { compId = 0  -- Set by caller when storing
                , ckArticleId = competitorArticleId
                , ckMarketplace = marketplace
                , ckKeywords = ckrKeywords competitorResult
                , ckCollectedAt = now
                }