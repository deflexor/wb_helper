-- | Application configuration
module Config where

import Data.Text (Text)
import qualified Data.Text as T

-- | Server configuration
data Config = Config
  { configPort :: Int
  , configHost :: String
  , configJWTSecret :: Text  -- ^ JWT signing secret (must be at least 32 bytes)
  , configDatabasePath :: FilePath  -- ^ Path to SQLite database
  , configOpenRouterKey :: Maybe Text  -- ^ OpenRouter API key (optional)
  , configLogLevel :: Text  -- ^ Logging level (debug, info, warn, error)
  } deriving (Show, Eq)

-- | Default configuration
defaultConfig :: Config
defaultConfig = Config
  { configPort = 8080
  , configHost = "0.0.0.0"
  , configJWTSecret = T.pack "change-me-in-production"
  , configDatabasePath = "/data/wbhelper.db"
  , configOpenRouterKey = Nothing
  , configLogLevel = T.pack "info"
  }