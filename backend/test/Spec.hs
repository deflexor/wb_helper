-- Test suite for wbhelper
module Main where

import Test.Hspec
import App.Hello
import qualified Data.Text as T
import Domain.MarginSpec
import Domain.PriceAnalysisSpec
import AI.OpenRouterSpec
import AI.QdrantSpec
import AI.PromptsSpec
import AI.OrchestratorSpec
import Infra.RateLimitSpec
import Infra.RateLimit.UsageTrackerSpec
import Auth.JWTSpec
import Auth.MiddlewareSpec

main :: IO ()
main = hspec $ do
  describe "App.Hello" $ do
    it "returns Hello World JSON response" $ do
      helloResponse `shouldBe` "{\"message\":\"Hello World\"}"

    it "has correct JSON structure" $ do
      helloResponse `shouldContain` "Hello World"
      helloResponse `shouldContain` "message"

    it "helloMessage is correct Text" $ do
      T.pack "Hello World" `shouldBe` helloMessage

  Domain.MarginSpec.spec
  Domain.PriceAnalysisSpec.spec
  AI.OpenRouterSpec.spec
  AI.QdrantSpec.spec
  AI.PromptsSpec.spec
  AI.OrchestratorSpec.spec
  Infra.RateLimitSpec.spec
  Infra.RateLimit.UsageTrackerSpec.spec
  Auth.JWTSpec.spec
  Auth.MiddlewareSpec.spec
