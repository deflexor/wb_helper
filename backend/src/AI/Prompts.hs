-- | AI.Prompts - Prompt template system for AI orchestration
{-# LANGUAGE OverloadedStrings #-}
module AI.Prompts
  ( ToolType(..)
  , TemplateContext(..)
  , PromptTemplate(..)
  , renderTemplate
  , getSEOGeneratorPrompt
  , getReviewAnalyzerPrompt
  , getPricingAdvisorPrompt
  , getSEOClusteringPrompt
  , getSEODroppedDetectionPrompt
  , getSEOCompetitorAnalysisPrompt
  , getKeywordSuggestionsPrompt
  ) where

import Data.Text (Text)
import Data.Text qualified as T
import Data.Maybe (fromMaybe)

import Auth.JWT (Plan(..))
import Domain.Marketplace (Marketplace(..), marketplaceToText)

-- | Tool type for different AI tasks
data ToolType = SEOGenerator | ReviewAnalyzer | PricingAdvisor
    | SEOClustering | SEODroppedDetection | SEOCompetitorAnalysis
    deriving (Show, Eq)

-- | Template context with variable placeholders
data TemplateContext = TemplateContext
    { tcUserId :: Int
    , tcUserPlan :: Plan
    , tcProductName :: Text
    , tcCompetitorData :: Maybe Text
    , tcNicheData :: Maybe Text
    , tcLanguage :: Text  -- "en" or "ru"
    } deriving (Show, Eq)

-- | Prompt template
data PromptTemplate = PromptTemplate
    { ptTool :: ToolType
    , ptSystemPrompt :: Text
    , ptUserTemplate :: Text
    } deriving (Show, Eq)

-- | Render a template with context (variable interpolation)
renderTemplate :: TemplateContext -> PromptTemplate -> Text
renderTemplate ctx tmpl =
    T.replace (T.pack "{userId}") (T.pack $ show $ tcUserId ctx)
    . T.replace (T.pack "{productName}") (tcProductName ctx)
    . T.replace (T.pack "{competitorData}") (fromMaybe (T.pack "N/A") $ tcCompetitorData ctx)
    . T.replace (T.pack "{nicheData}") (fromMaybe (T.pack "N/A") $ tcNicheData ctx)
    . T.replace (T.pack "{language}") (tcLanguage ctx)
    $ ptUserTemplate tmpl

-- | Get SEO Generator prompt (system, user)
getSEOGeneratorPrompt :: TemplateContext -> (Text, Text)
getSEOGeneratorPrompt ctx = (systemPrompt, renderTemplate ctx userTemplate)
  where
    systemPrompt :: Text
    systemPrompt = "You are an SEO expert for marketplace sellers. Help optimize product listings for search visibility and ranking."

    userTemplate :: PromptTemplate
    userTemplate = PromptTemplate
        { ptTool = SEOGenerator
        , ptSystemPrompt = systemPrompt
        , ptUserTemplate = T.concat
            [ "Generate SEO content for {productName} in language: {language}. "
            , "Competitor data: {competitorData}"
            ]
        }

-- | Get Review Analyzer prompt (system, user)
getReviewAnalyzerPrompt :: TemplateContext -> (Text, Text)
getReviewAnalyzerPrompt ctx = (systemPrompt, renderTemplate ctx userTemplate)
  where
    systemPrompt :: Text
    systemPrompt = "You are a review analysis expert. Help analyze customer reviews to identify trends, sentiment, and actionable insights."

    userTemplate :: PromptTemplate
    userTemplate = PromptTemplate
        { ptTool = ReviewAnalyzer
        , ptSystemPrompt = systemPrompt
        , ptUserTemplate = T.concat
            [ "Analyze customer reviews for {productName}. "
            , "Identify trends: {nicheData}"
            ]
        }

-- | Get Pricing Advisor prompt (system, user)
getPricingAdvisorPrompt :: TemplateContext -> (Text, Text)
getPricingAdvisorPrompt ctx = (systemPrompt, renderTemplate ctx userTemplate)
  where
    systemPrompt :: Text
    systemPrompt = "You are a pricing strategy expert. Help optimize pricing based on market data, competitor pricing, and value proposition."

    userTemplate :: PromptTemplate
    userTemplate = PromptTemplate
        { ptTool = PricingAdvisor
        , ptSystemPrompt = systemPrompt
        , ptUserTemplate = T.concat
            [ "Advise on pricing for {productName}. "
            , "Considering competitors: {competitorData}"
            ]
        }

-- | Get SEO Keyword Clustering prompt (system, user)
getSEOClusteringPrompt :: [Text] -> Marketplace -> (Text, Text)
getSEOClusteringPrompt keywords marketplace = (systemPrompt, userPrompt)
  where
    systemPrompt :: Text
    systemPrompt = T.concat
        [ "You are an SEO expert specializing in semantic keyword clustering. "
        , "Group keywords into semantically similar clusters for marketplace SEO optimization. "
        , "Return a JSON array of clusters, each containing keywords that are semantically related."
        ]

    userPrompt :: Text
    userPrompt = T.concat
        [ "Cluster the following keywords by semantic similarity for "
        , T.pack $ marketplaceToText marketplace
        , " marketplace:\n\n"
        , T.intercalate "\n" (map (\(i, kw) -> T.pack (show (i + 1) :: String) <> ". " <> kw) (zip [0..] keywords))
        , "\n\nReturn JSON in format: [{\"clusterName\":\"name\",\"keywords\":[\"kw1\",\"kw2\"]}]"
        ]

-- | Get SEO Dropped Keywords Detection prompt (system, user)
getSEODroppedDetectionPrompt :: Text -> Marketplace -> (Text, Text)
getSEODroppedDetectionPrompt articleId marketplace = (systemPrompt, userPrompt)
  where
    systemPrompt :: Text
    systemPrompt = T.concat
        [ "You are an SEO expert specializing in keyword position tracking and dropout detection. "
        , "Analyze keyword position changes to identify keywords that have significantly dropped or disappeared. "
        , "Return a JSON array of dropped keywords with details about when they dropped and their previous positions."
        ]

    userPrompt :: Text
    userPrompt = T.concat
        [ "Detect dropped keywords for article/product ID: "
        , articleId
        , " on "
        , T.pack $ marketplaceToText marketplace
        , " marketplace.\n"
        , "Analyze historical position data and identify keywords that have significantly dropped (>10 positions) or disappeared from search results."
        , "\n\nReturn JSON in format: [{\"keyword\":\"text\",\"lastSeen\":\"date\",\"previousPosition\":N,\"droppedAt\":\"date\"}]"
        ]

-- | Get SEO Competitor Analysis prompt (system, user)
getSEOCompetitorAnalysisPrompt :: Text -> Marketplace -> (Text, Text)
getSEOCompetitorAnalysisPrompt competitorArticleId marketplace = (systemPrompt, userPrompt)
  where
    systemPrompt :: Text
    systemPrompt = T.concat
        [ "You are an SEO expert specializing in competitor keyword analysis. "
        , "Extract and analyze keywords that competitors are ranking for. "
        , "Return the extracted keywords along with estimated relevance and search volume indicators."
        ]

    userPrompt :: Text
    userPrompt = T.concat
        [ "Analyze competitor article/product ID: "
        , competitorArticleId
        , " on "
        , T.pack $ marketplaceToText marketplace
        , " marketplace.\n"
        , "Extract all relevant keywords this competitor is likely ranking for based on the product category and listing optimization.\n"
        , "Return JSON in format: {\"keywords\":[\"kw1\",\"kw2\",\"kw3\"],\"analysisDate\":\"YYYY-MM-DD\"}"
        ]

-- | Generate Keyword Suggestions prompt
getKeywordSuggestionsPrompt :: [Text] -> Text -> Marketplace -> (Text, Text)
getKeywordSuggestionsPrompt competitorKeywords category marketplace = (systemPrompt, userPrompt)
  where
    systemPrompt :: Text
    systemPrompt = T.concat
        [ "You are an SEO expert specializing in keyword research and opportunity identification. "
        , "Analyze competitor keywords and suggest new keyword opportunities based on semantic relevance and marketplace context."
        ]

    userPrompt :: Text
    userPrompt = T.concat
        [ "Based on competitor keywords: "
        , T.intercalate ", " competitorKeywords
        , "\n\nFor product category: "
        , category
        , "\n\nOn "
        , T.pack $ marketplaceToText marketplace
        , " marketplace, suggest new keyword opportunities that the competitor might not be targeting.\n"
        , "Return a JSON array of suggested keywords: [\"kw1\", \"kw2\", \"kw3\"]"
        ]