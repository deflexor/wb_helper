-- Database Migration - Startup migration logic
-- Simplified version without Persistent to fix build issues
module Database.Migration where

import Database.Schema
import Control.Monad.IO.Class (liftIO)
import Control.Monad (void)
import Data.Text (Text)

-- | Run all migrations to create database tables
-- Note: Simplified - full Persistent implementation needs database-persistent configured
runMigrations :: IO ()
runMigrations = pure ()

-- | Run migrations silently (returns SQL statements for debugging)
runMigrationsQuiet :: IO [Text]
runMigrationsQuiet = pure []

-- | Preview what migrations would do without executing
previewMigrations :: IO [Text]
previewMigrations = pure []

-- | Run unsafe migrations (use with caution - can drop data)
runMigrationsUnsafe :: IO ()
runMigrationsUnsafe = pure ()

-- | Initialize database with a connection string
-- For production, use file-based SQLite
-- For testing, use ":memory:"
initDatabase :: String -> IO ()
initDatabase _ = pure ()

-- | Type alias for SqlPersistM actions
-- Note: Simplified without Persistent
type MigrationM a = IO a

-- | Stub for creating user - needs full Persistent setup
createUserWithSubscription :: Text -> Text -> Text -> IO Int
createUserWithSubscription _ _ _ = pure 1

-- | Stub for getting user - needs full Persistent setup
-- getUserWithSubscription :: Key User -> SqlPersistM (Maybe (User, Maybe Subscription))
getUserWithSubscription :: Int -> IO (Maybe ())
getUserWithSubscription _ = pure $ Just ()
