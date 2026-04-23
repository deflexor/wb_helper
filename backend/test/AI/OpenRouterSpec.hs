-- | Tests for AI.OpenRouter - OpenRouter API client
{-# LANGUAGE OverloadedStrings #-}
module AI.OpenRouterSpec where

import Test.Hspec
import Data.Aeson (encode, decode)
import Data.Text (Text)
import qualified Data.Text as T
import qualified Data.Text.Encoding as TEnc
import qualified Data.ByteString.Lazy as LBS
import Data.ByteString qualified as BS

import AI.OpenRouter
import AI.OpenRouter.Types

main :: IO ()
main = hspec spec

spec :: Spec
spec = do
  describe "ChatMessage" $ do
    it "serializes user message correctly" $ do
      let msg = ChatMessage "user" "Hello, world!"
          json = encode msg
          jsonText = TEnc.decodeUtf8 (LBS.toStrict json)
      T.isInfixOf "\"role\":\"user\"" jsonText `shouldBe` True
      T.isInfixOf "\"content\":\"Hello, world!\"" jsonText `shouldBe` True

    it "serializes assistant message correctly" $ do
      let msg = ChatMessage "assistant" "I can help."
          json = encode msg
          jsonText = TEnc.decodeUtf8 (LBS.toStrict json)
      T.isInfixOf "\"role\":\"assistant\"" jsonText `shouldBe` True
      T.isInfixOf "\"content\":\"I can help.\"" jsonText `shouldBe` True

    it "deserializes user message correctly" $ do
      let json = "{\"role\":\"user\",\"content\":\"Hello\"}"
          result = decode @(ChatMessage) (LBS.fromStrict $ TEnc.encodeUtf8 json)
      result `shouldBe` Just (ChatMessage "user" "Hello")

  describe "ChatCompletionRequest" $ do
    it "serializes request with all fields" $ do
      let req = ChatCompletionRequest
            { ccrModel = "meta-llama/llama-3-8b-instruct"
            , ccrMessages = [ChatMessage "user" "Hi"]
            , ccrTemperature = 0.7
            , ccrMaxTokens = 100
            }
          json = encode req
          jsonText = TEnc.decodeUtf8 (LBS.toStrict json)
      T.isInfixOf "\"model\":\"meta-llama/llama-3-8b-instruct\"" jsonText `shouldBe` True
      T.isInfixOf "\"temperature\":0.7" jsonText `shouldBe` True
      T.isInfixOf "\"max_tokens\":100" jsonText `shouldBe` True

  describe "ChatCompletionResponse" $ do
    it "parses successful response correctly" $ do
      let json = T.concat
            [ "{\"id\":\"chatcmpl-123\",\"choices\":["
            , "{\"message\":{\"role\":\"assistant\",\"content\":\"Hello!\"}}"
            , "],\"usage\":{\"total_tokens\":50}}"
            ]
          result = decode @ChatCompletionResponse (LBS.fromStrict $ TEnc.encodeUtf8 json)
      result `shouldBe` Just (ChatCompletionResponse "chatcmpl-123" "Hello!" 50)

    it "handles empty choices gracefully" $ do
      let json = "{\"id\":\"chatcmpl-789\",\"choices\":[],\"usage\":{\"total_tokens\":0}}"
          result = decode @ChatCompletionResponse (LBS.fromStrict $ TEnc.encodeUtf8 json)
      result `shouldBe` Nothing

  describe "OpenRouterConfig" $ do
    it "has correct default base URL" $ do
      openRouterBaseUrl defaultOpenRouterConfig
        `shouldBe` "https://openrouter.ai/api/v1/chat/completions"

    it "has reasonable defaults" $ do
      openRouterMaxTokens defaultOpenRouterConfig `shouldBe` 1000
      openRouterTimeout defaultOpenRouterConfig `shouldBe` 60000000

  describe "OpenRouterError" $ do
    it "has Show instance" $ do
      show (OpenRouterConfigMissing "API key") `shouldContain` "OpenRouterConfigMissing"