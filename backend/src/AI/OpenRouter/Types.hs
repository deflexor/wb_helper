{-# LANGUAGE OverloadedStrings #-}
-- | OpenRouter API Types
module AI.OpenRouter.Types
  ( ChatMessage(..)
  , ChatCompletionRequest(..)
  , ChatCompletionResponse(..)
  , OpenRouterConfig(..)
  , defaultOpenRouterConfig
  ) where

import Data.Aeson ((.:), FromJSON(..), ToJSON(toJSON), (.=), object)
import Data.Aeson qualified as A
import Data.Text (Text)
import GHC.Exts (IsString(fromString))

-- | Chat message structure for OpenRouter API
data ChatMessage = ChatMessage
  { msgRole :: Text    -- ^ Role: "user", "assistant", "system"
  , msgContent :: Text -- ^ Message content
  } deriving (Show, Eq)

instance ToJSON ChatMessage where
  toJSON msg = object
    [ "role" .= msgRole msg
    , "content" .= msgContent msg
    ]

instance FromJSON ChatMessage where
  parseJSON = A.withObject "ChatMessage" $ \obj ->
    ChatMessage <$> obj .: "role" <*> obj .: "content"

-- | Request for chat completion
data ChatCompletionRequest = ChatCompletionRequest
  { ccrModel :: Text
  , ccrMessages :: [ChatMessage]
  , ccrTemperature :: Double
  , ccrMaxTokens :: Int
  } deriving (Show, Eq)

instance ToJSON ChatCompletionRequest where
  toJSON req = object
    [ "model" .= ccrModel req
    , "messages" .= ccrMessages req
    , "temperature" .= ccrTemperature req
    , "max_tokens" .= ccrMaxTokens req
    ]

-- | Response from chat completion
data ChatCompletionResponse = ChatCompletionResponse
  { ccrId :: Text
  , ccrContent :: Text
  , ccrUsage :: Int
  } deriving (Show, Eq)

instance FromJSON ChatCompletionResponse where
  parseJSON = A.withObject "ChatCompletionResponse" $ \obj -> do
    ccrId <- obj .: "id"
    choices <- obj .: "choices"
    usage <- obj .: "usage"
    choice <- case choices of
      (c:_) -> pure c
      _ -> fail "No choices"
    msg <- choice A..: "message"
    ccrContent <- msg .: "content"
    ccrUsage <- usage .: "total_tokens"
    pure ChatCompletionResponse
      { ccrId = ccrId
      , ccrContent = ccrContent
      , ccrUsage = ccrUsage
      }

-- | OpenRouter configuration
data OpenRouterConfig = OpenRouterConfig
  { openRouterBaseUrl :: Text
  , openRouterApiKey :: Text
  , openRouterMaxTokens :: Int
  , openRouterTimeout :: Int
  } deriving (Show, Eq)

-- | Default OpenRouter configuration
defaultOpenRouterConfig :: OpenRouterConfig
defaultOpenRouterConfig = OpenRouterConfig
  { openRouterBaseUrl = "https://openrouter.ai/api/v1/chat/completions"
  , openRouterApiKey = ""
  , openRouterMaxTokens = 1000
  , openRouterTimeout = 60000000
  }