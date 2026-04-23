-- | Model Router - Tier-based AI model selection
{-# LANGUAGE OverloadedStrings #-}
module AI.ModelRouter
    ( AIModel(..)
    , ModelConfig(..)
    , selectModel
    , getModelId
    , getFallbacks
    ) where

import Data.Text (Text)
import Auth.JWT (Plan(..))

-- | Available AI models
data AIModel
    = Llama38B
    | Gemma7B
    | Qwen
    | Claude35Sonnet
    | GPT4o
    deriving (Show, Eq)

-- | Model configuration with fallback chain
data ModelConfig = ModelConfig
    { mcPrimary :: AIModel           -- ^ First choice model
    , mcFallbacks :: [AIModel]       -- ^ Fallback chain
    , mcSupportsStreaming :: Bool   -- ^ Whether streaming is supported
    } deriving (Show, Eq)

-- | Select model config based on user plan
selectModel :: Plan -> ModelConfig
selectModel Free = ModelConfig
    { mcPrimary = Llama38B
    , mcFallbacks = [Gemma7B, Qwen]
    , mcSupportsStreaming = True
    }
selectModel Paid = ModelConfig
    { mcPrimary = Claude35Sonnet
    , mcFallbacks = [GPT4o]
    , mcSupportsStreaming = True
    }

-- | Get OpenRouter model ID for an AIModel
getModelId :: AIModel -> Text
getModelId Llama38B = "meta-llama/llama-3-8b-instruct"
getModelId Gemma7B = "google/gemma-7b-it"
getModelId Qwen = "qwen/qwen-2.5-7b-instruct"
getModelId Claude35Sonnet = "anthropic/claude-3.5-sonnet"
getModelId GPT4o = "openai/gpt-4o"

-- | Get fallback chain from ModelConfig
getFallbacks :: ModelConfig -> [AIModel]
getFallbacks = mcFallbacks