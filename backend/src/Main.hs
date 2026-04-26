-- | Main entry point
module Main where

import App (runApp)
import Config (Config(..), defaultConfig)
import Data.Text (Text)
import qualified Data.Text as T
import qualified Data.Text.IO as TIO
import System.IO (stderr)
import System.Exit (exitWith, ExitCode(ExitFailure))
import System.Environment (lookupEnv)

-- | Read environment variable with fallback
readEnv :: String -> String -> IO String
readEnv key fallback = fromMaybe fallback <$> lookupEnv key
  where
    fromMaybe def Nothing = def
    fromMaybe _ (Just v) = v

-- | Read required environment variable (fails if not set)
readRequiredEnv :: String -> IO (Either String Text)
readRequiredEnv key = do
    mbVal <- lookupEnv key
    case mbVal of
        Nothing -> pure $ Left $ "Required environment variable " ++ key ++ " is not set"
        Just v | null v -> pure $ Left $ "Environment variable " ++ key ++ " cannot be empty"
        Just v -> pure $ Right (T.pack v)

-- | Validate JWT secret length (minimum 32 bytes for 256-bit security)
validateJWTSecret :: Text -> Either String Text
validateJWTSecret secret
    | T.length secret < 32 = Left "JWT_SECRET must be at least 32 characters (256 bits)"
    | otherwise = Right secret

main :: IO ()
main = do
    -- Read required environment variables
    jwtSecretResult <- readRequiredEnv "JWT_SECRET"
    dbPath <- readEnv "DATABASE_PATH" (configDatabasePath defaultConfig)
    portStr <- readEnv "PORT" (show (configPort defaultConfig))
    logLevel <- readEnv "LOG_LEVEL" (T.unpack $ configLogLevel defaultConfig)
    openRouterKey <- lookupEnv "OPENROUTER_API_KEY"

    -- Validate JWT secret
    case jwtSecretResult >>= validateJWTSecret of
        Left err -> do
            TIO.hPutStrLn stderr (T.pack $ "Configuration error: " ++ err)
            exitFailure
        Right jwtSecret -> do
            let config = Config
                    { configPort = read portStr
                    , configHost = "0.0.0.0"
                    , configJWTSecret = jwtSecret
                    , configDatabasePath = dbPath
                    , configOpenRouterKey = T.pack <$> openRouterKey
                    , configLogLevel = T.pack logLevel
                    }
            runApp config

exitFailure :: IO ()
exitFailure = do
    putStrLn "Failed to start application"
    exitWith (ExitFailure 1)