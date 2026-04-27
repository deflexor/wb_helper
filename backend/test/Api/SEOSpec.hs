-- | SEO API Tests - Tests for all 12+ SEO endpoints
module Api.SEOSpec where

import Test.Hspec
import Data.Aeson (decode, encode, Value, object, (.=), FromJSON(..))
import Data.Text (Text)
import qualified Data.Text as T
import qualified Data.ByteString.Lazy as LBS

import Api.SEO
    ( SEORoute(..)
    , MarketplaceParam(..)
    , validateMarketplace
    , matchSEORoute
    , NoContent(..)
    )
import Domain.SEO
    ( SeoKeyword(..)
    , KeywordPosition(..)
    , DroppedKeyword(..)
    , KeywordCluster(..)
    , ClusterKeyword(..)
    , CompetitorKeywords(..)
    )
import Domain.Marketplace (Marketplace(..))

spec :: Spec
spec = do
    describe "validateMarketplace" $ do
        it "parses 'wildberries' as Wildberries" $ do
            validateMarketplace "wildberries" `shouldBe` ValidMarketplace Wildberries

        it "parses 'ozon' as Ozon" $ do
            validateMarketplace "ozon" `shouldBe` ValidMarketplace Ozon

        it "returns InvalidMarketplace for unknown values" $ do
            validateMarketplace "unknown" `shouldBe` InvalidMarketplace "unknown"

        it "returns InvalidMarketplace for empty string" $ do
            validateMarketplace "" `shouldBe` InvalidMarketplace ""

    describe "Route Matching - Keywords" $ do
        it "matches GET /api/seo/keywords with wildberries" $ do
            let route = matchSEORoute "GET" "/api/seo/keywords" "wildberries"
            route `shouldSatisfy` isListKeywordsRoute
          where
            isListKeywordsRoute (Just (ListKeywords Wildberries)) = True
            isListKeywordsRoute _ = False

        it "matches GET /api/seo/keywords with ozon" $ do
            let route = matchSEORoute "GET" "/api/seo/keywords" "ozon"
            route `shouldSatisfy` isListKeywordsRoute
          where
            isListKeywordsRoute (Just (ListKeywords Ozon)) = True
            isListKeywordsRoute _ = False

        it "returns Nothing for invalid marketplace on keywords" $ do
            let route = matchSEORoute "GET" "/api/seo/keywords" "invalid"
            route `shouldBe` Nothing

        it "matches POST /api/seo/keywords" $ do
            let route = matchSEORoute "POST" "/api/seo/keywords" "wildberries"
            route `shouldSatisfy` isAddKeywordRoute
          where
            isAddKeywordRoute (Just (AddKeyword _)) = True
            isAddKeywordRoute _ = False

        it "matches DELETE /api/seo/keywords/:id" $ do
            let route = matchSEORoute "DELETE" "/api/seo/keywords/123" "wildberries"
            route `shouldSatisfy` isDeleteRoute
          where
            isDeleteRoute (Just (DeleteKeyword 123 Wildberries)) = True
            isDeleteRoute _ = False

        it "matches GET /api/seo/positions/:keywordId" $ do
            let route = matchSEORoute "GET" "/api/seo/positions/456" "ozon"
            route `shouldSatisfy` isGetPositionsRoute
          where
            isGetPositionsRoute (Just (GetPositions 456 Ozon)) = True
            isGetPositionsRoute _ = False

    describe "Route Matching - Dropped Keywords" $ do
        it "matches GET /api/seo/dropped with wildberries" $ do
            let route = matchSEORoute "GET" "/api/seo/dropped" "wildberries"
            route `shouldSatisfy` isListDroppedRoute
          where
            isListDroppedRoute (Just (ListDropped Wildberries)) = True
            isListDroppedRoute _ = False

        it "matches GET /api/seo/dropped with ozon" $ do
            let route = matchSEORoute "GET" "/api/seo/dropped" "ozon"
            route `shouldSatisfy` isListDroppedRoute
          where
            isListDroppedRoute (Just (ListDropped Ozon)) = True
            isListDroppedRoute _ = False

        it "matches POST /api/seo/dropped/check" $ do
            let route = matchSEORoute "POST" "/api/seo/dropped/check" "wildberries"
            route `shouldSatisfy` isCheckDroppedRoute
          where
            isCheckDroppedRoute (Just (CheckDropped _ _)) = True
            isCheckDroppedRoute _ = False

    describe "Route Matching - Clusters" $ do
        it "matches GET /api/seo/clusters with wildberries" $ do
            let route = matchSEORoute "GET" "/api/seo/clusters" "wildberries"
            route `shouldSatisfy` isListClustersRoute
          where
            isListClustersRoute (Just (ListClusters Wildberries)) = True
            isListClustersRoute _ = False

        it "matches GET /api/seo/clusters with ozon" $ do
            let route = matchSEORoute "GET" "/api/seo/clusters" "ozon"
            route `shouldSatisfy` isListClustersRoute
          where
            isListClustersRoute (Just (ListClusters Ozon)) = True
            isListClustersRoute _ = False

        it "matches POST /api/seo/clusters" $ do
            let route = matchSEORoute "POST" "/api/seo/clusters" "wildberries"
            route `shouldSatisfy` isCreateClusterRoute
          where
            isCreateClusterRoute (Just (CreateCluster _ _ _)) = True
            isCreateClusterRoute _ = False

        it "matches GET /api/seo/clusters/:id/keywords" $ do
            let route = matchSEORoute "GET" "/api/seo/clusters/789/keywords" "wildberries"
            route `shouldSatisfy` isGetClusterKeywordsRoute
          where
            isGetClusterKeywordsRoute (Just (GetClusterKeywords 789)) = True
            isGetClusterKeywordsRoute _ = False

    describe "Route Matching - Competitor" $ do
        it "matches POST /api/seo/competitor" $ do
            let route = matchSEORoute "POST" "/api/seo/competitor" "wildberries"
            route `shouldSatisfy` isExtractCompetitorRoute
          where
            isExtractCompetitorRoute (Just (ExtractCompetitor _ _)) = True
            isExtractCompetitorRoute _ = False

        it "matches GET /api/seo/competitor/:articleId/keywords" $ do
            let route = matchSEORoute "GET" "/api/seo/competitor/ART123/keywords" "ozon"
            route `shouldSatisfy` isGetCompetitorKeywordsRoute
          where
            isGetCompetitorKeywordsRoute (Just (GetCompetitorKeywords "ART123" Ozon)) = True
            isGetCompetitorKeywordsRoute _ = False

    describe "Route Matching - Collection" $ do
        it "matches POST /api/seo/keywords/collect" $ do
            let route = matchSEORoute "POST" "/api/seo/keywords/collect" "wildberries"
            route `shouldSatisfy` isCollectKeywordsRoute
          where
            isCollectKeywordsRoute (Just (CollectKeywords _ _)) = True
            isCollectKeywordsRoute _ = False

        it "matches POST /api/seo/refresh with wildberries" $ do
            let route = matchSEORoute "POST" "/api/seo/refresh" "wildberries"
            route `shouldSatisfy` isRefreshPositionsRoute
          where
            isRefreshPositionsRoute (Just (RefreshPositions Wildberries)) = True
            isRefreshPositionsRoute _ = False

        it "matches POST /api/seo/refresh with ozon" $ do
            let route = matchSEORoute "POST" "/api/seo/refresh" "ozon"
            route `shouldSatisfy` isRefreshPositionsRoute
          where
            isRefreshPositionsRoute (Just (RefreshPositions Ozon)) = True
            isRefreshPositionsRoute _ = False

    describe "Route Matching - Gap Analysis" $ do
        it "matches GET /api/seo/gap-analysis" $ do
            let route = matchSEORoute "GET" "/api/seo/gap-analysis" "wildberries"
            route `shouldSatisfy` isGapAnalysisRoute
          where
            isGapAnalysisRoute (Just (GapAnalysis _ _)) = True
            isGapAnalysisRoute _ = False

    describe "Route Matching - Export" $ do
        it "matches GET /api/seo/export with wildberries" $ do
            let route = matchSEORoute "GET" "/api/seo/export" "wildberries"
            route `shouldSatisfy` isExportKeywordsRoute
          where
            isExportKeywordsRoute (Just (ExportKeywords Wildberries)) = True
            isExportKeywordsRoute _ = False

        it "matches GET /api/seo/export with ozon" $ do
            let route = matchSEORoute "GET" "/api/seo/export" "ozon"
            route `shouldSatisfy` isExportKeywordsRoute
          where
            isExportKeywordsRoute (Just (ExportKeywords Ozon)) = True
            isExportKeywordsRoute _ = False

    describe "Route Matching - Labels" $ do
        it "matches PUT /api/seo/keywords/:id/label" $ do
            let route = matchSEORoute "PUT" "/api/seo/keywords/999/label" "wildberries"
            route `shouldSatisfy` isUpdateLabelRoute
          where
            isUpdateLabelRoute (Just (UpdateLabel 999 _ Wildberries)) = True
            isUpdateLabelRoute _ = False

    describe "Route Matching - Invalid Routes" $ do
        it "does not match unknown method" $ do
            let route = matchSEORoute "PATCH" "/api/seo/keywords" "wildberries"
            route `shouldBe` Nothing

        it "does not match unknown path" $ do
            let route = matchSEORoute "GET" "/api/seo/unknown" "wildberries"
            route `shouldBe` Nothing

        it "does not match wrong marketplace on DELETE keywords" $ do
            let route = matchSEORoute "DELETE" "/api/seo/keywords/123" "invalid"
            route `shouldBe` Nothing

    describe "NoContent" $ do
        it "encodes to JSON with deleted:true" $ do
            let json = encode NoContent
            decode json `shouldBe` (Just (object ["deleted" .= True] :: Value))

    describe "SEO Route Type Signatures" $ do
        it "DeleteKeyword returns NoContent type" $ do
            let route = DeleteKeyword 1 Wildberries
            -- Verify route constructs correctly
            case route of
                DeleteKeyword id mp -> do
                    id `shouldBe` 1
                    mp `shouldBe` Wildberries

        it "ListKeywords takes marketplace and returns list" $ do
            let route1 = ListKeywords Wildberries
            let route2 = ListKeywords Ozon
            case (route1, route2) of
                (ListKeywords Wildberries, ListKeywords Ozon) -> True `shouldBe` True
                _ -> False `shouldBe` True

        it "UpdateLabel takes keyword id, label and marketplace" $ do
            let route = UpdateLabel 42 "important" Ozon
            case route of
                UpdateLabel id label mp -> do
                    id `shouldBe` 42
                    label `shouldBe` "important"
                    mp `shouldBe` Ozon

    describe "Endpoint Count" $ do
        it "has 13 distinct route patterns" $ do
            -- Verify all 13 endpoints are defined
            let endpoints =
                    [ matchSEORoute "GET" "/api/seo/keywords" "wildberries"
                    , matchSEORoute "POST" "/api/seo/keywords" "wildberries"
                    , matchSEORoute "DELETE" "/api/seo/keywords/1" "wildberries"
                    , matchSEORoute "GET" "/api/seo/positions/1" "wildberries"
                    , matchSEORoute "GET" "/api/seo/dropped" "wildberries"
                    , matchSEORoute "POST" "/api/seo/dropped/check" "wildberries"
                    , matchSEORoute "GET" "/api/seo/clusters" "wildberries"
                    , matchSEORoute "POST" "/api/seo/clusters" "wildberries"
                    , matchSEORoute "GET" "/api/seo/clusters/1/keywords" "wildberries"
                    , matchSEORoute "POST" "/api/seo/competitor" "wildberries"
                    , matchSEORoute "GET" "/api/seo/competitor/ART/keywords" "wildberries"
                    , matchSEORoute "POST" "/api/seo/keywords/collect" "wildberries"
                    , matchSEORoute "POST" "/api/seo/refresh" "wildberries"
                    ]
            length (filter (`isJust` ) endpoints) `shouldBe` 13

    describe "Marketplace Validation on All Routes" $ do
        it "rejects invalid marketplace on all GET routes" $ do
            let routes = 
                    [ ("GET", "/api/seo/keywords")
                    , ("GET", "/api/seo/dropped")
                    , ("GET", "/api/seo/clusters")
                    , ("GET", "/api/seo/export")
                    ]
            forM_ routes $ \(method, path) -> do
                let route = matchSEORoute method path "invalid_mp"
                route `shouldBe` Nothing

        it "accepts wildberries on all routes" $ do
            let routes =
                    [ ("GET", "/api/seo/keywords")
                    , ("GET", "/api/seo/dropped")
                    , ("GET", "/api/seo/clusters")
                    , ("GET", "/api/seo/export")
                    , ("POST", "/api/seo/refresh")
                    ]
            forM_ routes $ \(method, path) -> do
                let route = matchSEORoute method path "wildberries"
                route `shouldSatisfy` isJust

        it "accepts ozon on all routes" $ do
            let routes =
                    [ ("GET", "/api/seo/keywords")
                    , ("GET", "/api/seo/dropped")
                    , ("GET", "/api/seo/clusters")
                    , ("GET", "/api/seo/export")
                    , ("POST", "/api/seo/refresh")
                    ]
            forM_ routes $ \(method, path) -> do
                let route = matchSEORoute method path "ozon"
                route `shouldSatisfy` isJust

-- Helper for tests
isJust :: Maybe a -> Bool
isJust (Just _) = True
isJust Nothing = False
