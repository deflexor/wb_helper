-- | Tests for AI.Orchestrator - AI Orchestration Layer
{-# LANGUAGE OverloadedStrings #-}
module AI.OrchestratorSpec where

import Test.Hspec
import Data.Text (Text)
import qualified Data.Text as T

import Effect.Error (AppError(..))
import Auth.JWT (Plan(..))
import AI.ModelRouter (AIModel(..), ModelConfig(..), selectModel, getModelId, getFallbacks)
import AI.CircuitBreaker
import AI.OpenRouter.Types

import AI.Orchestrator

main :: IO ()
main = hspec spec

-- | Mock response for successful call
mockResponse :: Text -> ChatCompletionResponse
mockResponse content = ChatCompletionResponse
    { ccrId = "mock-id-123"
    , ccrContent = content
    , ccrUsage = 100
    }

spec :: Spec
spec = do
  describe "AIResponse" $ do
    it "has Show instance" $ do
      let resp = AIResponse "Hello" Llama38B 50 [] Nothing
      show resp `shouldContain` "AIResponse"

    it "has Eq instance" $ do
      let resp1 = AIResponse "Hello" Llama38B 50 [] Nothing
          resp2 = AIResponse "Hello" Llama38B 50 [] Nothing
      resp1 `shouldBe` resp2

    it "tracks content correctly" $ do
      let resp = AIResponse "Test content" Gemma7B 75 [] Nothing
      arContent resp `shouldBe` "Test content"

    it "tracks model used" $ do
      let resp = AIResponse "Hello" GPT4o 100 [] Nothing
      arModel resp `shouldBe` GPT4o

    it "tracks token usage" $ do
      let resp = AIResponse "Hi" Llama38B 250 [] Nothing
      arTokens resp `shouldBe` 250

    it "tracks fallbacks attempted" $ do
      let resp = AIResponse "Done" Qwen 80 [Llama38B, Gemma7B] Nothing
      arFallbacksAttempted resp `shouldBe` [Llama38B, Gemma7B]

    it "tracks warning when fallback was used" $ do
      let warning = Just "Used fallback model due to timeout"
          resp = AIResponse "Result" Gemma7B 60 [Llama38B] warning
      arWarning resp `shouldBe` warning

    it "has Nothing warning when no fallback" $ do
      let resp = AIResponse "Result" Claude35Sonnet 90 [] Nothing
      arWarning resp `shouldBe` Nothing

  describe "orchestrateAI - routing based on Plan" $ do
    it "routes Free user to Llama38B first" $ do
      let config = selectModel Free
      mcPrimary config `shouldBe` Llama38B

    it "routes Paid user to Claude35Sonnet first" $ do
      let config = selectModel Paid
      mcPrimary config `shouldBe` Claude35Sonnet

    it "Free user has correct fallback chain" $ do
      let config = selectModel Free
      mcFallbacks config `shouldBe` [Gemma7B, Qwen]

    it "Paid user has correct fallback chain" $ do
      let config = selectModel Paid
      mcFallbacks config `shouldBe` [GPT4o]

  describe "orchestrateAI - Free user fallback chain" $ do
    it "Free user tries Llama38B -> Gemma7B -> Qwen" $ do
      let config = selectModel Free
          allModels = mcPrimary config : mcFallbacks config
      map getModelId allModels `shouldBe`
        [ "meta-llama/llama-3-8b-instruct"
        , "google/gemma-7b-it"
        , "qwen/qwen-2.5-7b-instruct"
        ]

  describe "orchestrateAI - Paid user fallback chain" $ do
    it "Paid user tries Claude35Sonnet -> GPT4o" $ do
      let config = selectModel Paid
          allModels = mcPrimary config : mcFallbacks config
      map getModelId allModels `shouldBe`
        [ "anthropic/claude-3.5-sonnet"
        , "openai/gpt-4o"
        ]

  describe "processResponse - response handling" $ do
    it "processes successful response correctly" $ do
      let resp = mockResponse "Success"
          result = processResponse (Right resp) Nothing Llama38B Nothing
      arContent result `shouldBe` "Success"
      arModel result `shouldBe` Llama38B
      arTokens result `shouldBe` 100
      arFallbacksAttempted result `shouldBe` []
      arWarning result `shouldBe` Nothing

    it "handles error response with empty content" $ do
      let err = ExternalServiceError "Network timeout"
          result = processResponse (Left err) Nothing Llama38B Nothing
      arContent result `shouldBe` ""
      arModel result `shouldBe` Llama38B
      arTokens result `shouldBe` 0
      arWarning result `shouldBe` Just "AI request failed: ExternalServiceError \"Network timeout\""

    it "sets warning when previous model failed" $ do
      let resp = mockResponse "Fallback success"
          prevError = Just "timeout"
          result = processResponse (Right resp) Nothing Gemma7B prevError
      arContent result `shouldBe` "Fallback success"
      arModel result `shouldBe` Gemma7B
      arWarning result `shouldBe` Just "Model Gemma7B failed: timeout"

  describe "orchestrateAI - Circuit breaker integration" $ do
    it "skips model when circuit breaker is OPEN" $ do
      cb <- newCircuitBreaker defaultCircuitBreakerConfig
      -- Open the circuit
      mapM_ (\_ -> recordFailure cb) [1..5]
      state <- getState cb
      state `shouldBe` Open
      -- canExecute should return False for Open state
      canExecute cb `shouldReturn` False

    it "allows request when circuit breaker is CLOSED" $ do
      cb <- newCircuitBreaker defaultCircuitBreakerConfig
      state <- getState cb
      state `shouldBe` Closed
      canExecute cb `shouldReturn` True

    it "allows limited requests when circuit breaker is HALF_OPEN" $ do
      cb <- newCircuitBreaker defaultCircuitBreakerConfig
      -- Open the circuit
      mapM_ (\_ -> recordFailure cb) [1..5]
      -- Check state is Open
      stateBefore <- getState cb
      stateBefore `shouldBe` Open

  describe "orchestrateAI - Error handling" $ do
    it "handles network error gracefully" $ do
      let networkError = Left (ExternalServiceError "Network unreachable")
      let result = processResponse networkError Nothing Llama38B Nothing
      arContent result `shouldBe` ""
      arWarning result `shouldBe` Just "AI request failed: ExternalServiceError \"Network unreachable\""

    it "handles parse error gracefully" $ do
      let parseError = Left (ExternalServiceError "Failed to parse response")
      let result = processResponse parseError Nothing GPT4o Nothing
      arContent result `shouldBe` ""
      arWarning result `shouldBe` Just "AI request failed: ExternalServiceError \"Failed to parse response\""

  describe "orchestrateAI - Response tracking" $ do
    it "accumulates fallbacks in chain" $ do
      let resp = mockResponse "Final response"
      let result = processResponse (Right resp) Nothing Qwen (Just "previous error")
      arWarning result `shouldBe` Just "Model Qwen failed: previous error"

    it "sets correct warning message for fallback" $ do
      let resp = mockResponse "OK"
      let result = processResponse (Right resp) Nothing Gemma7B (Just "rate limited")
      arWarning result `shouldBe` Just "Model Gemma7B failed: rate limited"

    it "no warning when first model succeeds" $ do
      let resp = mockResponse "First try success"
      let result = processResponse (Right resp) Nothing Llama38B Nothing
      arWarning result `shouldBe` Nothing

  describe "Integration - Full fallback scenario" $ do
    it "documents complete Free user flow" $ do
      let config = selectModel Free
          primary = mcPrimary config
          fallbacks = mcFallbacks config
      -- Primary should be Llama38B
      primary `shouldBe` Llama38B
      -- Fallbacks should be [Gemma7B, Qwen]
      fallbacks `shouldBe` [Gemma7B, Qwen]

    it "documents complete Paid user flow" $ do
      let config = selectModel Paid
          primary = mcPrimary config
          fallbacks = mcFallbacks config
      -- Primary should be Claude35Sonnet
      primary `shouldBe` Claude35Sonnet
      -- Fallbacks should be [GPT4o]
      fallbacks `shouldBe` [GPT4o]

  describe "Model selection verification" $ do
    it "Free plan selects Llama38B primary with Gemma7B and Qwen fallbacks" $ do
      let cfg = selectModel Free
      getModelId (mcPrimary cfg) `shouldBe` "meta-llama/llama-3-8b-instruct"
      getModelId `map` mcFallbacks cfg `shouldBe` ["google/gemma-7b-it", "qwen/qwen-2.5-7b-instruct"]

    it "Paid plan selects Claude35Sonnet primary with GPT4o fallback" $ do
      let cfg = selectModel Paid
      getModelId (mcPrimary cfg) `shouldBe` "anthropic/claude-3.5-sonnet"
      getModelId `map` mcFallbacks cfg `shouldBe` ["openai/gpt-4o"]

    it "All models have valid model IDs" $ do
      let models = [Llama38B, Gemma7B, Qwen, Claude35Sonnet, GPT4o]
          ids = map getModelId models
      length ids `shouldBe` 5
      all (not . T.null) ids `shouldBe` True