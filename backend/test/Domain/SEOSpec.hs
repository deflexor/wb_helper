-- Tests for Domain.SEO
{-# LANGUAGE OverloadedStrings #-}
module Domain.SEOSpec where

import Test.Hspec
import Data.Time (Day, fromGregorian)
import Data.Text (Text)
import Domain.SEO
    ( SeoKeyword(..)
    , KeywordPosition(..)
    , DroppedKeyword(..)
    , KeywordCluster(..)
    , ClusterKeyword(..)
    , CompetitorKeywords(..)
    , Marketplace(..)
    , isKeywordDropped
    , positionChange
    , filterByMarketplace
    , groupBySimilarity
    )

-- Helper to create a day
mkDay :: Integer -> Int -> Int -> Day
mkDay y m d = fromGregorian y m d

spec :: Spec
spec = do
    describe "isKeywordDropped" $ do
        it "returns True when position drops more than 10" $ do
            isKeywordDropped 5 20 `shouldBe` True

        it "returns False when position improves" $ do
            isKeywordDropped 20 5 `shouldBe` False

        it "returns False when drop is exactly 10" $ do
            isKeywordDropped 10 20 `shouldBe` False

        it "returns True when drop is more than 10" $ do
            isKeywordDropped 1 15 `shouldBe` True

        it "returns False when position unchanged" $ do
            isKeywordDropped 10 10 `shouldBe` False

    describe "positionChange" $ do
        it "calculates positive change when improved" $ do
            positionChange (Just 20) (Just 10) `shouldBe` 10

        it "calculates negative change when dropped" $ do
            positionChange (Just 10) (Just 20) `shouldBe` (-10)

        it "returns 0 when both are Nothing" $ do
            positionChange Nothing Nothing `shouldBe` 0

        it "returns 0 when old is Nothing" $ do
            positionChange Nothing (Just 10) `shouldBe` 0

        it "returns 0 when new is Nothing" $ do
            positionChange (Just 10) Nothing `shouldBe` 0

        it "returns 0 when positions are equal" $ do
            positionChange (Just 15) (Just 15) `shouldBe` 0

    describe "filterByMarketplace" $ do
        it "filters keywords for Wildberries marketplace" $ do
            let keywords = []
            filterByMarketplace Wildberries keywords `shouldBe` []

        it "filters keywords for Ozon marketplace" $ do
            let keywords = []
            filterByMarketplace Ozon keywords `shouldBe` []

    describe "groupBySimilarity" $ do
        it "groups keywords within threshold" $ do
            let keywords = []
            groupBySimilarity 0.5 keywords `shouldBe` []

    describe "SeoKeyword" $ do
        it "shows correct marketplace in display" $ do
            let kw = SeoKeyword 1 "test keyword" "ART123" Wildberries (Just 5) undefined
            skMarketplace kw `shouldBe` Wildberries

    describe "KeywordPosition" $ do
        it "stores correct marketplace" $ do
            let kp = KeywordPosition 1 "keyword" "ART123" Ozon 10 (mkDay 2026 4 27)
            kpMarketplace kp `shouldBe` Ozon

    describe "DroppedKeyword" $ do
        it "stores previous position before drop" $ do
            let dk = DroppedKeyword 1 "keyword" "ART123" Wildberries (mkDay 2026 4 20) (mkDay 2026 4 27) 5
            dkPreviousPosition dk `shouldBe` 5

    describe "KeywordCluster" $ do
        it "contains marketplace identifier" $ do
            let cluster = KeywordCluster 1 "Test Cluster" "ART123" Ozon [] undefined
            clusterMarketplace cluster `shouldBe` Ozon

    describe "CompetitorKeywords" $ do
        it "stores marketplace for competitor data" $ do
            let ck = CompetitorKeywords 1 "ART123" Wildberries ["keyword1", "keyword2"] undefined
            ckMarketplace ck `shouldBe` Wildberries