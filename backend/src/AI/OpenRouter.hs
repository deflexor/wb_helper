-- | OpenRouter API Client
module AI.OpenRouter
  ( module AI.OpenRouter.Types
  , OpenRouterConfig(..)
  , defaultOpenRouterConfig
  , buildOpenRouterRequest
  , callOpenRouter
  , OpenRouterError(..)
  ) where

import Control.Concurrent (threadDelay)
import Control.Exception (try, SomeException, fromException)
import Data.ByteString (ByteString)
import Data.ByteString qualified as BS
import Data.ByteString.Lazy qualified as LBS
import Data.Text (Text)
import Data.Text qualified as T
import Data.Text.Encoding qualified as TEnc
import Data.Aeson (encode, decode)
import Network.HTTP.Client (Request, Response(..), HttpException(..), httpLbs, parseRequest, RequestBody(RequestBodyLBS), requestHeaders)
import Network.HTTP.Client qualified as HTTP
import Network.HTTP.Types (statusCode)
import Control.Monad (when)
import System.Random (randomRIO)
import Data.CaseInsensitive qualified as CI
import Data.CaseInsensitive (CI)

import Effect.AppEffect (AppE, liftIO, Eff)
import Effect.Error (AppError(..), throwError)
import AI.OpenRouter.Types
import Infra.Retry (RetryConfig(..), defaultRetryConfig, applyJitter)

data OpenRouterError
  = OpenRouterNetworkError String
  | OpenRouterHttpError Int Text
  | OpenRouterParseError String
  | OpenRouterConfigMissing String
  deriving (Show, Eq)

-- | Build an HTTP request for OpenRouter API
-- | Build an HTTP request for OpenRouter API
buildOpenRouterRequest :: OpenRouterConfig -> ChatCompletionRequest -> Request
buildOpenRouterRequest config req = HTTP.parseRequest_ url
  where
    url = T.unpack $ openRouterBaseUrl config
    reqBody = RequestBodyLBS (encode req)
    apiKeyText = openRouterApiKey config
    apiKeyBs = TEnc.encodeUtf8 apiKeyText
    bearerBs = BS.append (TEnc.encodeUtf8 (T.pack "Bearer ")) apiKeyBs

    req' = HTTP.parseRequest_ url
    reqWithBody = req'
      { HTTP.requestBody = reqBody
      , HTTP.requestHeaders = 
          [ (CI.mk (TEnc.encodeUtf8 (T.pack "Authorization")), bearerBs)
          , (CI.mk (TEnc.encodeUtf8 (T.pack "Content-Type")), TEnc.encodeUtf8 (T.pack "application/json"))
          ]
      }

-- | Check if an HttpException is retryable
isRetryable :: SomeException -> Bool
isRetryable _ = True  -- Simplified: retry all exceptions

callOpenRouter
  :: (AppE es)
  => OpenRouterConfig
  -> ChatCompletionRequest
  -> Eff es (Either AppError ChatCompletionResponse)
callOpenRouter config req = do
  when (T.null (openRouterApiKey config)) $
    throwError $ ExternalServiceError "OpenRouter API key is missing"

  let httpReq = buildOpenRouterRequest config req
  result <- sendWithRetry defaultRetryConfig httpReq

  case result of
    Left ex ->
      throwError $ ExternalServiceError $ T.unpack $ T.concat [T.pack "OpenRouter request failed: ", T.pack (show ex)]
    Right response -> do
      case decode (HTTP.responseBody response) of
        Just resp -> pure $ Right resp
        Nothing -> throwError $ ExternalServiceError "Failed to parse OpenRouter response"

sendWithRetry :: (AppE es) => RetryConfig -> Request -> Eff es (Either SomeException (Response LBS.ByteString))
sendWithRetry config req = do
  manager <- liftIO $ HTTP.newManager HTTP.defaultManagerSettings
  go config manager 0
  where
    go cfg mgr attempt = do
      result <- liftIO $ try $ HTTP.httpLbs req mgr
      case result of
        Right resp -> pure $ Right resp
        Left ex
          | isRetryable ex && attempt < rcMaxRetries cfg -> do
              let delay = rcBaseDelay cfg * (2 ^ attempt)
              jittered <- liftIO $ applyJitter delay (rcJitter cfg)
              liftIO $ threadDelay jittered
              go cfg mgr (attempt + 1)
          | otherwise -> pure $ Left ex