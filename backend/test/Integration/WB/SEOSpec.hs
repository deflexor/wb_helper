-- Integration tests for WB SEO module
module Integration.WB.SEOSpec where

import Test.Hspec
import Data.ByteString (ByteString)
import Data.Text (Text)
import qualified Data.Text as T
import Data.Maybe (listToMaybe)

import Integration.WB.SEO
import Domain.SEO
import Domain.Marketplace (Marketplace(..))

-- =============================================================================
-- Test Fixtures
-- =============================================================================

-- | Sample HTML for search results page
sampleSearchResultsHtml :: ByteString
sampleSearchResultsHtml = mconcat
    [ "<html>"
    , "<body>"
    , "<a href=\"/catalog/v2/product?tm=12345&nm=100001\" data-id=\"100001\">Product 1</a>"
    , "<a href=\"/catalog/v2/product?tm=12346&nm=100002\" data-id=\"100002\">Product 2</a>"
    , "<a href=\"/catalog/v2/product?tm=12347&nm=100003\" data-id=\"100003\">Product 3</a>"
    , "</body>"
    , "</html>"
    ]

-- | Sample product card HTML
sampleProductCardHtml :: ByteString
sampleProductCardHtml = mconcat
    [ "<html>"
    , "<head>"
    , "<meta name=\"keywords\" content=\"keyword1, keyword2, keyword3\">"
    , "</head>"
    , "<body>"
    , "<h1>Product Title</h1>"
    , "<h2>Product Subtitle</h2>"
    , "<div class=\"product-description\">"
    , "This is a detailed product description with relevant keywords"
    , "</div>"
    , "</body>"
    , "</html>"
    ]

-- | Empty search results HTML
emptySearchResultsHtml :: ByteString
emptySearchResultsHtml = mconcat
    [ "<html>"
    , "<body>"
    , "<p>No results found</p>"
    , "</body>"
    , "</html>"
    ]

-- =============================================================================
-- WB SEO Integration Tests
-- =============================================================================

spec :: Spec
spec = do
    describe "SearchDepth" $ do
        describe "searchDepthToInt" $ do
            it "Depth100 returns 100" $ do
                searchDepthToInt Depth100 `shouldBe` 100

            it "Depth500 returns 500" $ do
                searchDepthToInt Depth500 `shouldBe` 500

            it "Depth1000 returns 1000" $ do
                searchDepthToInt Depth1000 `shouldBe` 1000

            it "Depth10000 returns 10000" $ do
                searchDepthToInt Depth10000 `shouldBe` 10000

    describe "parseSearchResults" $ do
        it "extracts article IDs and positions from HTML" $ do
            let results = parseSearchResults sampleSearchResultsHtml
            length results `shouldBe` 3

        it "assigns correct positions to articles" $ do
            let results = parseSearchResults sampleSearchResultsHtml
            listToMaybe results `shouldSatisfy` maybe False (\(_, pos) -> pos == 1)

        it "returns empty list for empty search results" $ do
            let results = parseSearchResults emptySearchResultsHtml
            results `shouldBe` []

        it "handles malformed HTML gracefully" $ do
            let results = parseSearchResults "<html><body></body></html>"
            results `shouldBe` []

    describe "extractKeywordsFromCard" $ do
        it "extracts meta keywords" $ do
            let keywords = extractKeywordsFromCard sampleProductCardHtml
            length keywords `shouldBe` 3

        it "extracts heading keywords" $ do
            let keywords = extractKeywordsFromCard sampleProductCardHtml
            keywords `shouldSatisfy` any (\k -> T.toLower k `T.isInfixOf` T.pack "product")

        it "extracts description keywords" $ do
            let keywords = extractKeywordsFromCard sampleProductCardHtml
            keywords `shouldSatisfy` not . null

        it "returns empty list for minimal HTML" $ do
            let keywords = extractKeywordsFromCard "<html><body></body></html>"
            keywords `shouldBe` []

    describe "WBSearchItem" $ do
        it "stores article ID correctly" $ do
            let item = WBSearchItem
                    { wbsiArticleId = "123456"
                    , wbsiPosition = 1
                    , wbsiName = Just "Test Product"
                    , wbsiBrand = Just "Test Brand"
                    }
            wbsiArticleId item `shouldBe` "123456"

        it "stores position correctly" $ do
            let item = WBSearchItem
                    { wbsiArticleId = "123456"
                    , wbsiPosition = 5
                    , wbsiName = Just "Test Product"
                    , wbsiBrand = Just "Test Brand"
                    }
            wbsiPosition item `shouldBe` 5

        it "allows optional name and brand" $ do
            let item = WBSearchItem
                    { wbsiArticleId = "123456"
                    , wbsiPosition = 1
                    , wbsiName = Nothing
                    , wbsiBrand = Nothing
                    }
            wbsiName item `shouldBe` Nothing
            wbsiBrand item `shouldBe` Nothing

    describe "WBSearchResult" $ do
        it "stores keyword and items" $ do
            let result = WBSearchResult
                    { wbsrKeyword = "test query"
                    , wbsrItems = []
                    , wbsrTotal = 0
                    }
            wbsrKeyword result `shouldBe` "test query"
            wbsrItems result `shouldBe` []
            wbsrTotal result `shouldBe` 0

        it "calculates total from items length" $ do
            let items = [ WBSearchItem "1" 1 Nothing Nothing
                       , WBSearchItem "2" 2 Nothing Nothing
                       , WBSearchItem "3" 3 Nothing Nothing
                       ]
                result = WBSearchResult "query" items (length items)
            wbsrTotal result `shouldBe` 3

    describe "WBApiConfig" $ do
        it "has correct default base URL" $ do
            let config = defaultWBApiConfig
            wbacBaseUrl config `shouldBe` "https://catalog.wb.ru"

        it "has reasonable timeout" $ do
            let config = defaultWBApiConfig
            wbacTimeout config `shouldBe` 30000000

    describe "findArticlePosition" $ do
        it "finds position for existing article" $ do
            let items = [("100001", 1), ("100002", 2), ("100003", 3)]
            findArticlePosition "100002" items `shouldBe` Just 2

        it "returns Nothing for non-existing article" $ do
            let items = [("100001", 1), ("100002", 2)]
            findArticlePosition "999999" items `shouldBe` Nothing

        it "returns Nothing for empty list" $ do
            findArticlePosition "100001" [] `shouldBe` Nothing

-- =============================================================================
-- URL Encoding Tests
-- =============================================================================

    describe "URL encoding" $ do
        it "encodes spaces as %20" $ do
            let input = T.pack "hello world"
                encoded = encodeUrlText input
            encoded `shouldBe` T.pack "hello%20world"

        it "encodes ampersands as %26" $ do
            let input = T.pack "a&b"
                encoded = encodeUrlText input
            encoded `shouldBe` T.pack "a%26b"
