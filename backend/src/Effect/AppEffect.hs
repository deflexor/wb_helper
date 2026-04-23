-- | Main effect stack definition for the application
--
-- This module defines the effect stack for the application using effectful-2.0.
-- The effect stack combines:
--
-- - 'IOE': for actual IO operations
-- - 'Error' with 'AppError': for typed error handling
-- - 'Reader' with 'Config': for configuration injection
-- - 'State' with 'AppState': for application state (caches, rate limiters)
--
-- Usage:
--
-- Functions that need the full App effect stack should use the 'AppE' constraint:
--
-- > myFunction :: (AppE es) => Eff es Int
-- > myFunction = do
-- >   cfg <- ask
-- >   n <- get
-- >   when (n < 0) $ throwError (ConfigurationError "negative value")
-- >   pure n
--
-- To run effects, compose the runners in this order: State -> Reader -> Error
module Effect.AppEffect
  ( -- * Effect Stack Constraints
    AppE
    -- * Re-exports
  , module Effectful
  , module Effectful.State.Static.Local
  , module Effectful.Reader.Static
  , module Effectful.Error.Static
    -- * AppState
  , module Effect.State
  ) where

import Effectful
import Effectful.State.Static.Local
import Effectful.Reader.Static
import Effectful.Error.Static

import Config (Config(..))
import Effect.State
import Effect.Error

-- | Effect constraint synonym for the App effect stack
--
-- This combines:
-- - 'IOE': for actual IO operations
-- - 'Error' with 'AppError': for typed error handling
-- - 'Reader' with 'Config': for configuration injection
-- - 'State' with 'AppState': for application state (caches, rate limiters)
type AppE es = (IOE :> es, Error AppError :> es, Reader Config :> es, State AppState :> es)