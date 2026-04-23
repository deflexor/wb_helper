-- | Error effect utilities for application-wide error handling
module Effect.Error
  ( module Effectful.Error.Static
  , AppError(..)
  , throwAppError
  , catchAppError
  , mapAppError
  ) where

import Effectful
import Effectful.Error.Static (Error, throwError, catchError, runError, runErrorNoCallStack, throwErrorWith)

-- | Application-specific errors
data AppError
  = NotFound String
  | InvalidInput String
  | ConfigurationError String
  | ExternalServiceError String
  deriving (Show, Eq)

-- | Throw an application error
throwAppError :: (Error AppError :> es) => AppError -> Eff es a
throwAppError = throwError

-- | Catch and handle application errors
catchAppError :: (Error AppError :> es) => Eff es a -> (AppError -> Eff es a) -> Eff es a
catchAppError action handler = catchError action $ \_ err -> handler err

-- | Map over an error
mapAppError :: (Error AppError :> es) => (AppError -> AppError) -> Eff es a -> Eff es a
mapAppError f action = catchError action $ \_ err -> throwError (f err)