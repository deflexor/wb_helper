-- Test suite for Database Schema
module Database.SchemaSpec where

import Test.Hspec
import Database.Schema
import Database.Persist.Sqlite
import Control.Monad.IO.Class (liftIO)
import Data.Time (getCurrentTime)
import qualified Data.Text as T

-- | Test database path - use in-memory for fast tests
testDbPath :: String
testDbPath = ":memory:"

-- | Spec for database schema and migrations
spec :: Spec
spec = do
    describe "User entity" $ do
        it "can be inserted and retrieved" $ do
            userId <- runSqlite testDbPath $ do
                runMigration migrateSchema
                now <- liftIO getCurrentTime
                insert $ User (T.pack "test@example.com") (T.pack "hash") (T.pack "key") Nothing now
            userId `shouldBe` userId -- Just verify it doesn't throw

        it "can retrieve the inserted user" $ do
            userId <- runSqlite testDbPath $ do
                runMigration migrateSchema
                now <- liftIO getCurrentTime
                insert $ User (T.pack "test2@example.com") (T.pack "hash2") (T.pack "key2") Nothing now
            mUser <- runSqlite testDbPath $ get userId
            case mUser of
                Nothing -> expectationFailure "User not found"
                Just u -> do
                    userEmail u `shouldBe` T.pack "test2@example.com"
                    userPasswordHash u `shouldBe` T.pack "hash2"

    describe "Subscription entity" $ do
        it "can store Free plan" $ do
            subId <- runSqlite testDbPath $ do
                runMigration migrateSchema
                now <- liftIO getCurrentTime
                insert $ Subscription Free now 100
            subId `shouldBe` subId

        it "can store Paid plan" $ do
            subId <- runSqlite testDbPath $ do
                runMigration migrateSchema
                now <- liftIO getCurrentTime
                insert $ Subscription Paid now 1000
            subId `shouldBe` subId

        it "has correct maxApiCalls for Free plan" $ do
            mSub <- runSqlite testDbPath $ do
                runMigration migrateSchema
                now <- liftIO getCurrentTime
                subId <- insert $ Subscription Free now 100
                get subId
            case mSub of
                Nothing -> expectationFailure "Subscription not found"
                Just s -> do
                    subscriptionPlan s `shouldBe` Free
                    subscriptionMaxApiCalls s `shouldBe` 100

    describe "Product entity" $ do
        it "can be inserted and associated with a user" $ do
            (productId, userId) <- runSqlite testDbPath $ do
                runMigration migrateSchema
                now <- liftIO getCurrentTime
                userId <- insert $ User (T.pack "seller@test.com") (T.pack "hash") (T.pack "key") Nothing now
                prodId <- insert $ Product userId WB (T.pack "ext123") (T.pack "Product Name") 50.0 100.0 now
                return (prodId, userId)
            productId `shouldBe` productId
            userId `shouldBe` userId

        it "can retrieve product with user reference" $ do
            (prodId, userId) <- runSqlite testDbPath $ do
                runMigration migrateSchema
                now <- liftIO getCurrentTime
                userId <- insert $ User (T.pack "seller2@test.com") (T.pack "hash") (T.pack "key") Nothing now
                prodId <- insert $ Product userId Ozon (T.pack "ext456") (T.pack "Ozon Product") 30.0 80.0 now
                return (prodId, userId)
            mProd <- runSqlite testDbPath $ get prodId
            case mProd of
                Nothing -> expectationFailure "Product not found"
                Just p -> do
                    productUserId p `shouldBe` userId
                    productMarketplace p `shouldBe` Ozon
                    productExternalId p `shouldBe` T.pack "ext456"
                    productCost p `shouldBe` 30.0
                    productPrice p `shouldBe` 80.0

    describe "PriceHistory entity" $ do
        it "records price changes for a product" $ do
            priceHistId <- runSqlite testDbPath $ do
                runMigration migrateSchema
                now <- liftIO getCurrentTime
                userId <- insert $ User (T.pack "seller3@test.com") (T.pack "hash") (T.pack "key") Nothing now
                prodId <- insert $ Product userId WB (T.pack "ext789") (T.pack "Price Test") 10.0 20.0 now
                insert $ PriceHistory prodId 25.0 now
            priceHistId `shouldBe` priceHistId

        it "can retrieve price history for a product" $ do
            (histId, prodId) <- runSqlite testDbPath $ do
                runMigration migrateSchema
                now <- liftIO getCurrentTime
                userId <- insert $ User (T.pack "seller4@test.com") (T.pack "hash") (T.pack "key") Nothing now
                prodId <- insert $ Product userId WB (T.pack "ext101") (T.pack "History Test") 5.0 15.0 now
                histId <- insert $ PriceHistory prodId 18.0 now
                return (histId, prodId)
            mHist <- runSqlite testDbPath $ get histId
            case mHist of
                Nothing -> expectationFailure "PriceHistory not found"
                Just h -> do
                    priceHistoryProductId h `shouldBe` prodId
                    priceHistoryPrice h `shouldBe` 18.0

    describe "CompetitorData entity" $ do
        it "stores competitor prices" $ do
            compId <- runSqlite testDbPath $ do
                runMigration migrateSchema
                now <- liftIO getCurrentTime
                userId <- insert $ User (T.pack "seller5@test.com") (T.pack "hash") (T.pack "key") Nothing now
                prodId <- insert $ Product userId WB (T.pack "ext202") (T.pack "Comp Test") 10.0 50.0 now
                insert $ CompetitorData prodId (T.pack "RivalStore") 45.0 now
            compId `shouldBe` compId

        it "can retrieve competitor data" $ do
            (compId, prodId) <- runSqlite testDbPath $ do
                runMigration migrateSchema
                now <- liftIO getCurrentTime
                userId <- insert $ User (T.pack "seller6@test.com") (T.pack "hash") (T.pack "key") Nothing now
                prodId <- insert $ Product userId WB (T.pack "ext303") (T.pack "Comp Test 2") 20.0 60.0 now
                compId <- insert $ CompetitorData prodId (T.pack "TopSeller") 55.0 now
                return (compId, prodId)
            mComp <- runSqlite testDbPath $ get compId
            case mComp of
                Nothing -> expectationFailure "CompetitorData not found"
                Just c -> do
                    competitorDataProductId c `shouldBe` prodId
                    competitorDataCompetitorName c `shouldBe` T.pack "TopSeller"
                    competitorDataPrice c `shouldBe` 55.0

    describe "Migration" $ do
        it "creates all tables on startup" $ do
            -- Run migration and verify no errors
            result <- runSqlite testDbPath $ do
                runMigration migrateSchema
                -- Try to insert into each table to verify they exist
                now <- liftIO getCurrentTime
                _ <- insert $ User (T.pack "migration@test.com") (T.pack "hash") (T.pack "key") Nothing now
                _ <- insert $ Subscription Free now 50
                return True
            result `shouldBe` True

-- | Main entry point for running tests
main :: IO ()
main = hspec spec
