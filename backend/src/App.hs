-- | Main application module
module App where

import Config (Config(..))

-- | Application entry point
runApp :: Config -> IO ()
runApp cfg = putStrLn $ "Starting server on " ++ configHost cfg ++ ":" ++ show (configPort cfg)