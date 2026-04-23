-- | AI Orchestrator - Coordinates all AI components with fallback logic
module AI.Orchestrator
    ( AIResponse(..)
    , orchestrateAI
    , withFallback
    , processResponse
    ) where

import Data.Text (Text)
import qualified Data.Text as T

import Effectful (Eff)
import Effect.AppEffect (AppE, liftIO)
import Effect.Error (AppError(..), throwError)
import Auth.JWT (Plan(..))
import AI.ModelRouter
    ( AIModel(..)
    , ModelConfig(..)
    , selectModel
    , getModelId
    , getFallbacks
    )
import AI.CircuitBreaker
    ( CircuitBreaker
    , CircuitState(..)
    , canExecute
    , recordSuccess
    , recordFailure
    )
import AI.OpenRouter
    ( OpenRouterConfig(..)
    , callOpenRouter
    )
import AI.OpenRouter.Types
    ( ChatMessage(..)
    , ChatCompletionRequest(..)
    , ChatCompletionResponse(..)
    )

-- | Response from AI orchestration
data AIResponse = AIResponse
    { arContent :: Text                    -- ^ Response content
    , arModel :: AIModel                   -- ^ Model used
    , arTokens :: Int                      -- ^ Token usage
    , arFallbacksAttempted :: [AIModel]     -- ^ Models that were tried
    , arWarning :: Maybe Text              -- ^ Warning message (e.g., "Used fallback model due to...")
    } deriving (Show, Eq)

-- | Build a chat completion request
buildRequest :: Text -> Text -> Text -> ChatCompletionRequest
buildRequest modelId sysPrompt userMsg = ChatCompletionRequest
    { ccrModel = modelId
    , ccrMessages =
        [ ChatMessage (T.pack "system") sysPrompt
        , ChatMessage (T.pack "user") userMsg
        ]
    , ccrTemperature = 0.7
    , ccrMaxTokens = 1000
    }

-- | Get circuit breaker for a model (stub - in production would look up from AppState)
getCircuitBreaker :: AIModel -> IO CircuitBreaker
getCircuitBreaker _model = error "getCircuitBreaker not implemented - would look up from AppState"

-- | Check if circuit breaker allows execution (stub implementation)
checkCircuitBreaker :: AIModel -> IO Bool
checkCircuitBreaker _model = pure True -- In production, would check actual circuit breaker state

-- | Record success on circuit breaker
recordCircuitSuccess :: AIModel -> IO ()
recordCircuitSuccess model = do
    cb <- getCircuitBreaker model
    recordSuccess cb

-- | Record failure on circuit breaker
recordCircuitFailure :: AIModel -> IO ()
recordCircuitFailure model = do
    cb <- getCircuitBreaker model
    recordFailure cb

-- | Main orchestration function - routes to correct model based on Plan
--
-- This function implements the fallback decision tree:
-- - Free user: Llama38B -> Gemma7B -> Qwen
-- - Paid user: Claude35Sonnet -> GPT4o
--
-- Each model is checked against circuit breaker state before execution.
orchestrateAI
    :: (AppE es)
    => Plan           -- ^ User's subscription plan
    -> Text          -- ^ System prompt
    -> Text          -- ^ User message
    -> OpenRouterConfig
    -> Eff es AIResponse
orchestrateAI plan systemPrompt userMessage config = do
    let modelConfig = selectModel plan
        allModels = mcPrimary modelConfig : mcFallbacks modelConfig
    orchestrateLoop allModels Nothing
    where
        -- orchestrateLoop processes the model chain, tracking any previous error
        orchestrateLoop :: (AppE es) => [AIModel] -> Maybe Text -> Eff es AIResponse
        orchestrateLoop [] _ = throwError $ ExternalServiceError "No AI models available"
        orchestrateLoop (model:restModels) prevError = do
            -- Check if we can execute (circuit breaker check)
            canExec <- liftIO $ checkCircuitBreaker model
            if not canExec
                then do
                    -- Circuit is open, skip to next model
                    let newError = Just $ T.concat [T.pack "Circuit breaker open for ", T.pack (show model)]
                    orchestrateLoop restModels newError
                else do
                    -- Execute the model
                    let modelId = getModelId model
                        req = buildRequest modelId systemPrompt userMessage
                    result <- callOpenRouter config req

                    case result of
                        Right resp -> do
                            -- Success - record and return
                            liftIO $ recordCircuitSuccess model
                            let warning = case prevError of
                                    Nothing -> Nothing
                                    Just err -> Just $ T.concat [T.pack "Model ", T.pack (show model), T.pack " failed: ", err]
                            pure $ AIResponse
                                { arContent = ccrContent resp
                                , arModel = model
                                , arTokens = ccrUsage resp
                                , arFallbacksAttempted = []
                                , arWarning = warning
                                }
                        Left err -> do
                            -- Failure - record and try next model
                            liftIO $ recordCircuitFailure model
                            let newError = Just $ T.pack (show err)
                            case restModels of
                                [] -> throwError err
                                _ -> do
                                    nextResp <- orchestrateLoop restModels newError
                                    pure $ nextResp
                                        { arFallbacksAttempted = model : arFallbacksAttempted nextResp
                                        , arWarning = Just $ T.concat
                                            [ T.pack "All AI models failed. Last error: "
                                            , T.pack (show err)
                                            ]
                                        }

-- | Handle fallback across multiple models
--
-- This function is used when we need to try multiple models in sequence.
-- It tracks the error from the previous attempt to build the fallback chain.
withFallback
    :: (AppE es)
    => [AIModel]      -- ^ Models to try in order
    -> Text          -- ^ System prompt
    -> Text          -- ^ User message
    -> Maybe Text    -- ^ Error from previous attempt
    -> OpenRouterConfig
    -> Eff es AIResponse
withFallback [] _ _ _ _ = throwError $ ExternalServiceError "No models available in fallback chain"
withFallback (model:restModels) systemPrompt userMessage prevError config = do
    canExec <- liftIO $ checkCircuitBreaker model
    if not canExec
        then withFallback restModels systemPrompt userMessage
                (Just $ T.concat [T.pack "Circuit breaker open for ", T.pack (show model)]) config
        else do
            let modelId = getModelId model
                req = buildRequest modelId systemPrompt userMessage
            result <- callOpenRouter config req

            case result of
                Right resp -> do
                    liftIO $ recordCircuitSuccess model
                    let warning = case prevError of
                            Nothing -> Nothing
                            Just err -> Just $ T.concat [T.pack "Model ", T.pack (show model), T.pack " failed: ", err]
                    pure $ AIResponse
                        { arContent = ccrContent resp
                        , arModel = model
                        , arTokens = ccrUsage resp
                        , arFallbacksAttempted = []
                        , arWarning = warning
                        }
                Left err -> do
                    liftIO $ recordCircuitFailure model
                    let newError = Just $ T.pack (show err)
                    nextResp <- withFallback restModels systemPrompt userMessage newError config
                    pure $ nextResp
                        { arFallbacksAttempted = model : arFallbacksAttempted nextResp
                        }

-- | Process response or determine if fallback is needed
--
-- This function processes a response (success or failure) and creates
-- an appropriate AIResponse with fallback tracking.
processResponse
    :: Either AppError ChatCompletionResponse  -- ^ Response or error
    -> Maybe CircuitBreaker                      -- ^ Circuit breaker for the model
    -> AIModel                                   -- ^ Current model
    -> Maybe Text                               -- ^ Previous error (for fallback tracking)
    -> AIResponse
processResponse (Right resp) _ model prevError = AIResponse
    { arContent = ccrContent resp
    , arModel = model
    , arTokens = ccrUsage resp
    , arFallbacksAttempted = []
    , arWarning = case prevError of
        Nothing -> Nothing
        Just err -> Just $ T.concat [T.pack "Model ", T.pack (show model), T.pack " failed: ", err]
    }
processResponse (Left err) _ model _ = AIResponse
    { arContent = T.empty
    , arModel = model
    , arTokens = 0
    , arFallbacksAttempted = []
    , arWarning = Just $ T.concat [T.pack "AI request failed: ", T.pack (show err)]
    }