-- Database Migration - Startup migration logic
module Database.Migration where

import Database.Persist.Sqlite
import Database.Schema
import Control.Monad.IO.Class (liftIO)
import Control.Monad (void)
import Data.Text (Text)

-- | Run all migrations to create database tables
runMigrations :: IO ()
runMigrations = runSqlite "wbhelper.db" $ void $ runMigrationQuiet migrateSchema

-- | Run migrations silently (returns SQL statements for debugging)
runMigrationsQuiet :: IO [Text]
runMigrationsQuiet = runSqlite "wbhelper.db" $ showMigration migrateSchema

-- | Preview what migrations would do without executing
previewMigrations :: IO [Text]
previewMigrations = runSqlite "wbhelper.db" $ showMigration migrateSchema

-- | Run unsafe migrations (use with caution - can drop data)
runMigrationsUnsafe :: IO ()
runMigrationsUnsafe = runSqlite "wbhelper.db" $ void $ runMigrationUnsafe migrateSchema

-- | Initialize database with a connection string
-- For production, use file-based SQLite
-- For testing, use ":memory:"
initDatabase :: String -> IO ()
initDatabase dbPath = runSqlite dbPath $ void $ runMigrationQuiet migrateSchema

-- | Type alias for SqlPersistM actions
type MigrationM a = SqlPersistM a

-- | Helper to create a user with subscription
-- Returns the UserId on success
createUserWithSubscription
    :: Text          -- ^ email
    -> Text          -- ^ passwordHash
    -> Text          -- ^ apiKey
    -> UTCTime       -- ^ createdAt
    -> SqlPersistM (Key User)
createUserWithSubscription email pwdHash apiKey createdAt = do
    insert $ User email pwdHash apiKey Nothing createdAt

-- | Helper to get user with subscription details
getUserWithSubscription
    :: Key User
    -> SqlPersistM (Maybe (User, Maybe Subscription))
getUserWithSubscription userId = do
    mUser <- get userId
    case mUser of
        Nothing -> return Nothing
        Just user -> do
            mSub <- case userSubscriptionId user of
                Nothing -> return Nothing
                Just subId -> get subId
            return $ Just (user, mSub)
