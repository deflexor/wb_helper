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
  ) where

import Data.Text (Text)
import Data.Text qualified as T
import Data.Maybe (fromMaybe)

import Auth.JWT (Plan(..))

-- | Tool type for different AI tasks
data ToolType = SEOGenerator | ReviewAnalyzer | PricingAdvisor
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