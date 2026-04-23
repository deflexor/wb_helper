-- | Reader effect utilities for configuration injection
module Effect.Reader
  ( module Effectful.Reader.Static
  , module Effectful
  , AppConfig
  , askAppConfig
  , localAppConfig
  ) where

import Effectful
import Effectful.Reader.Static
import Config (Config(..))

-- | Wrapper for Config to provide nicer constraint context
type AppConfig = Config

-- | Ask for the application configuration
askAppConfig :: (Reader Config :> es) => Eff es Config
askAppConfig = ask

-- | Locally modify the configuration
localAppConfig :: Reader Config :> es => (Config -> Config) -> Eff es a -> Eff es a
localAppConfig = local