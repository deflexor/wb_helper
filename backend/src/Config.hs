-- | Application configuration
module Config where

-- | Server configuration
data Config = Config
  { configPort :: Int
  , configHost :: String
  } deriving (Show, Eq)