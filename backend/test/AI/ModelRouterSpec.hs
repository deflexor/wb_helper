-- | Tests for AI.ModelRouter - Tier-based model selection
module AI.ModelRouterSpec where

import Test.Hspec
import Data.Text (Text)

import Auth.JWT (Plan(..))
import AI.ModelRouter

main :: IO ()
main = hspec spec

spec :: Spec
spec = do
  describe "AIModel" $ do
    it "has Show instance" $ do
      show Llama38B `shouldBe` "Llama38B"
      show GPT4o `shouldBe` "GPT4o"

    it "has Eq instance" $ do
      Llama38B `shouldBe` Llama38B
      Llama38B `shouldNotBe` Gemma7B

  describe "ModelConfig" $ do
    it "has Show instance" $ do
      let config = ModelConfig
            { mcPrimary = Llama38B
            , mcFallbacks = [Gemma7B, Qwen]
            , mcSupportsStreaming = True
            }
      show config `shouldContain` "Llama38B"

    it "has Eq instance" $ do
      let config1 = ModelConfig Llama38B [Gemma7B] True
          config2 = ModelConfig Llama38B [Gemma7B] True
          config3 = ModelConfig Gemma7B [Gemma7B] True
      config1 `shouldBe` config2
      config1 `shouldNotBe` config3

  describe "selectModel" $ do
    it "returns Llama38B as primary for Free plan" $ do
      let config = selectModel Free
      mcPrimary config `shouldBe` Llama38B

    it "returns [Gemma7B, Qwen] as fallbacks for Free plan" $ do
      let config = selectModel Free
      mcFallbacks config `shouldBe` [Gemma7B, Qwen]

    it "returns Claude35Sonnet as primary for Paid plan" $ do
      let config = selectModel Paid
      mcPrimary config `shouldBe` Claude35Sonnet

    it "returns [GPT4o] as fallbacks for Paid plan" $ do
      let config = selectModel Paid
      mcFallbacks config `shouldBe` [GPT4o]

    it "Free plan supports streaming" $ do
      let config = selectModel Free
      mcSupportsStreaming config `shouldBe` True

    it "Paid plan supports streaming" $ do
      let config = selectModel Paid
      mcSupportsStreaming config `shouldBe` True

  describe "getModelId" $ do
    it "returns correct ID for Llama38B" $ do
      getModelId Llama38B `shouldBe` "meta-llama/llama-3-8b-instruct"

    it "returns correct ID for Gemma7B" $ do
      getModelId Gemma7B `shouldBe` "google/gemma-7b-it"

    it "returns correct ID for Qwen" $ do
      getModelId Qwen `shouldBe` "qwen/qwen-2.5-7b-instruct"

    it "returns correct ID for Claude35Sonnet" $ do
      getModelId Claude35Sonnet `shouldBe` "anthropic/claude-3.5-sonnet"

    it "returns correct ID for GPT4o" $ do
      getModelId GPT4o `shouldBe` "openai/gpt-4o"

  describe "getFallbacks" $ do
    it "returns correct fallback chain for Free plan" $ do
      let config = selectModel Free
          fallbacks = getFallbacks config
      fallbacks `shouldBe` [Gemma7B, Qwen]

    it "returns correct fallback chain for Paid plan" $ do
      let config = selectModel Paid
          fallbacks = getFallbacks config
      fallbacks `shouldBe` [GPT4o]

    it "returns empty list when no fallbacks configured" $ do
      -- This test documents that an empty fallback list is possible
      let config = ModelConfig Claude35Sonnet [] True
          fallbacks = getFallbacks config
      fallbacks `shouldBe` []

  describe "Integration - Full model selection for Free user" $ do
    it "selects correct primary model" $ do
      let config = selectModel Free
      getModelId (mcPrimary config) `shouldBe` "meta-llama/llama-3-8b-instruct"

    it "selects correct fallback models in order" $ do
      let config = selectModel Free
          fallbackIds = map getModelId (mcFallbacks config)
      fallbackIds `shouldBe` ["google/gemma-7b-it", "qwen/qwen-2.5-7b-instruct"]

  describe "Integration - Full model selection for Paid user" $ do
    it "selects correct primary model" $ do
      let config = selectModel Paid
      getModelId (mcPrimary config) `shouldBe` "anthropic/claude-3.5-sonnet"

    it "selects correct fallback model" $ do
      let config = selectModel Paid
          fallbackIds = map getModelId (mcFallbacks config)
      fallbackIds `shouldBe` ["openai/gpt-4o"]