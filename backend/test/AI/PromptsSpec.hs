-- | Tests for AI.Prompts - Prompt template system
{-# LANGUAGE OverloadedStrings #-}
module AI.PromptsSpec where

import Test.Hspec
import Data.Text (Text)
import qualified Data.Text as T

import Auth.JWT (Plan(..))
import AI.Prompts

main :: IO ()
main = hspec spec

spec :: Spec
spec = do
  describe "ToolType" $ do
    it "has Show instance" $ do
      show SEOGenerator `shouldBe` "SEOGenerator"
      show ReviewAnalyzer `shouldBe` "ReviewAnalyzer"
      show PricingAdvisor `shouldBe` "PricingAdvisor"

    it "has Eq instance" $ do
      SEOGenerator `shouldBe` SEOGenerator
      ReviewAnalyzer `shouldNotBe` SEOGenerator

  describe "TemplateContext" $ do
    it "has Show instance" $ do
      let ctx = TemplateContext
            { tcUserId = 1
            , tcUserPlan = Free
            , tcProductName = "Widget"
            , tcCompetitorData = Nothing
            , tcNicheData = Nothing
            , tcLanguage = "en"
            }
      show ctx `shouldContain` "TemplateContext"
      show ctx `shouldContain` "Widget"

  describe "PromptTemplate" $ do
    it "has Show instance" $ do
      let tmpl = PromptTemplate
            { ptTool = SEOGenerator
            , ptSystemPrompt = "You are an SEO expert"
            , ptUserTemplate = "Generate SEO for {productName}"
            }
      show tmpl `shouldContain` "PromptTemplate"
      show tmpl `shouldContain` "SEOGenerator"

  describe "renderTemplate" $ do
    it "substitutes productName correctly" $ do
      let ctx = TemplateContext
            { tcUserId = 42
            , tcUserPlan = Free
            , tcProductName = "SuperWidget Pro"
            , tcCompetitorData = Nothing
            , tcNicheData = Nothing
            , tcLanguage = "en"
            }
          tmpl = PromptTemplate
            { ptTool = SEOGenerator
            , ptSystemPrompt = "You are an SEO expert"
            , ptUserTemplate = "Generate SEO for {productName}"
            }
          result = renderTemplate ctx tmpl
      result `shouldBe` "Generate SEO for SuperWidget Pro"

    it "substitutes language correctly" $ do
      let ctx = TemplateContext
            { tcUserId = 1
            , tcUserPlan = Paid
            , tcProductName = "Widget"
            , tcCompetitorData = Nothing
            , tcNicheData = Nothing
            , tcLanguage = "ru"
            }
          tmpl = PromptTemplate
            { ptTool = SEOGenerator
            , ptSystemPrompt = "You are an SEO expert"
            , ptUserTemplate = "Generate content in {language}"
            }
          result = renderTemplate ctx tmpl
      result `shouldBe` "Generate content in ru"

    it "substitutes competitorData when present" $ do
      let ctx = TemplateContext
            { tcUserId = 1
            , tcUserPlan = Free
            , tcProductName = "Widget"
            , tcCompetitorData = Just "CompetitorA: $50, CompetitorB: $45"
            , tcNicheData = Nothing
            , tcLanguage = "en"
            }
          tmpl = PromptTemplate
            { ptTool = SEOGenerator
            , ptSystemPrompt = "You are an SEO expert"
            , ptUserTemplate = "Competitor data: {competitorData}"
            }
          result = renderTemplate ctx tmpl
      result `shouldBe` "Competitor data: CompetitorA: $50, CompetitorB: $45"

    it "shows placeholder when competitorData is missing" $ do
      let ctx = TemplateContext
            { tcUserId = 1
            , tcUserPlan = Free
            , tcProductName = "Widget"
            , tcCompetitorData = Nothing
            , tcNicheData = Nothing
            , tcLanguage = "en"
            }
          tmpl = PromptTemplate
            { ptTool = SEOGenerator
            , ptSystemPrompt = "You are an SEO expert"
            , ptUserTemplate = "Competitor data: {competitorData}"
            }
          result = renderTemplate ctx tmpl
      result `shouldBe` "Competitor data: N/A"

    it "substitutes nicheData when present" $ do
      let ctx = TemplateContext
            { tcUserId = 1
            , tcUserPlan = Free
            , tcProductName = "Widget"
            , tcCompetitorData = Nothing
            , tcNicheData = Just "High demand: 1000+ searches/week"
            , tcLanguage = "en"
            }
          tmpl = PromptTemplate
            { ptTool = ReviewAnalyzer
            , ptSystemPrompt = "You are a review expert"
            , ptUserTemplate = "Niche trends: {nicheData}"
            }
          result = renderTemplate ctx tmpl
      result `shouldBe` "Niche trends: High demand: 1000+ searches/week"

    it "shows placeholder when nicheData is missing" $ do
      let ctx = TemplateContext
            { tcUserId = 1
            , tcUserPlan = Free
            , tcProductName = "Widget"
            , tcCompetitorData = Nothing
            , tcNicheData = Nothing
            , tcLanguage = "en"
            }
          tmpl = PromptTemplate
            { ptTool = ReviewAnalyzer
            , ptSystemPrompt = "You are a review expert"
            , ptUserTemplate = "Trends: {nicheData}"
            }
          result = renderTemplate ctx tmpl
      result `shouldBe` "Trends: N/A"

    it "substitutes userId correctly" $ do
      let ctx = TemplateContext
            { tcUserId = 123
            , tcUserPlan = Free
            , tcProductName = "Widget"
            , tcCompetitorData = Nothing
            , tcNicheData = Nothing
            , tcLanguage = "en"
            }
          tmpl = PromptTemplate
            { ptTool = SEOGenerator
            , ptSystemPrompt = "You are an SEO expert"
            , ptUserTemplate = "User ID: {userId}"
            }
          result = renderTemplate ctx tmpl
      result `shouldBe` "User ID: 123"

    it "handles all variables at once" $ do
      let ctx = TemplateContext
            { tcUserId = 1
            , tcUserPlan = Paid
            , tcProductName = "ProWidget"
            , tcCompetitorData = Just "Competitor: $100"
            , tcNicheData = Just "Growing market"
            , tcLanguage = "ru"
            }
          tmpl = PromptTemplate
            { ptTool = SEOGenerator
            , ptSystemPrompt = "Expert assistance for {language}"
            , ptUserTemplate = "Product: {productName}, Competitors: {competitorData}, Trends: {nicheData}"
            }
          result = renderTemplate ctx tmpl
      result `shouldBe` "Product: ProWidget, Competitors: Competitor: $100, Trends: Growing market"

  describe "getSEOGeneratorPrompt" $ do
    it "returns system and user prompts" $ do
      let ctx = TemplateContext
            { tcUserId = 1
            , tcUserPlan = Free
            , tcProductName = "SEO Widget"
            , tcCompetitorData = Just "Competitor data here"
            , tcNicheData = Nothing
            , tcLanguage = "en"
            }
          (systemPrompt, userPrompt) = getSEOGeneratorPrompt ctx
      T.isInfixOf "SEO expert" systemPrompt `shouldBe` True
      T.isInfixOf "SEO Widget" userPrompt `shouldBe` True
      T.isInfixOf "en" userPrompt `shouldBe` True
      T.isInfixOf "Competitor data here" userPrompt `shouldBe` True

    it "handles missing competitor data gracefully" $ do
      let ctx = TemplateContext
            { tcUserId = 1
            , tcUserPlan = Free
            , tcProductName = "Widget"
            , tcCompetitorData = Nothing
            , tcNicheData = Nothing
            , tcLanguage = "ru"
            }
          (_, userPrompt) = getSEOGeneratorPrompt ctx
      T.isInfixOf "N/A" userPrompt `shouldBe` True

  describe "getReviewAnalyzerPrompt" $ do
    it "returns system and user prompts" $ do
      let ctx = TemplateContext
            { tcUserId = 2
            , tcUserPlan = Paid
            , tcProductName = "Review Analyzer Widget"
            , tcCompetitorData = Nothing
            , tcNicheData = Just "Trending: 500+ reviews"
            , tcLanguage = "en"
            }
          (systemPrompt, userPrompt) = getReviewAnalyzerPrompt ctx
      T.isInfixOf "review analysis" systemPrompt `shouldBe` True
      T.isInfixOf "Review Analyzer Widget" userPrompt `shouldBe` True
      T.isInfixOf "Trending: 500+ reviews" userPrompt `shouldBe` True

    it "handles missing niche data gracefully" $ do
      let ctx = TemplateContext
            { tcUserId = 1
            , tcUserPlan = Free
            , tcProductName = "Widget"
            , tcCompetitorData = Nothing
            , tcNicheData = Nothing
            , tcLanguage = "en"
            }
          (_, userPrompt) = getReviewAnalyzerPrompt ctx
      T.isInfixOf "N/A" userPrompt `shouldBe` True

  describe "getPricingAdvisorPrompt" $ do
    it "returns system and user prompts" $ do
      let ctx = TemplateContext
            { tcUserId = 3
            , tcUserPlan = Paid
            , tcProductName = "Pricing Advisor Widget"
            , tcCompetitorData = Just "Competitor A: $80, Competitor B: $85"
            , tcNicheData = Nothing
            , tcLanguage = "en"
            }
          (systemPrompt, userPrompt) = getPricingAdvisorPrompt ctx
      T.isInfixOf "pricing strategy" systemPrompt `shouldBe` True
      T.isInfixOf "Pricing Advisor Widget" userPrompt `shouldBe` True
      T.isInfixOf "Competitor A: $80, Competitor B: $85" userPrompt `shouldBe` True

    it "handles missing competitor data gracefully" $ do
      let ctx = TemplateContext
            { tcUserId = 1
            , tcUserPlan = Free
            , tcProductName = "Widget"
            , tcCompetitorData = Nothing
            , tcNicheData = Nothing
            , tcLanguage = "en"
            }
          (_, userPrompt) = getPricingAdvisorPrompt ctx
      T.isInfixOf "N/A" userPrompt `shouldBe` True

  describe "integration - all variables replaced" $ do
    it "SEO template replaces all placeholders" $ do
      let ctx = TemplateContext
            { tcUserId = 99
            , tcUserPlan = Paid
            , tcProductName = "SuperSEO Product"
            , tcCompetitorData = Just "Comp1, Comp2"
            , tcNicheData = Just "SEO trends"
            , tcLanguage = "ru"
            }
          (systemPrompt, userPrompt) = getSEOGeneratorPrompt ctx
      T.isInfixOf "SuperSEO Product" userPrompt `shouldBe` True
      T.isInfixOf "ru" userPrompt `shouldBe` True
      T.isInfixOf "Comp1, Comp2" userPrompt `shouldBe` True
      T.isInfixOf "SEO expert" systemPrompt `shouldBe` True