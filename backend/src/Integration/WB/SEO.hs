-- | Wildberries SEO Integration - Keyword tracking and position monitoring
{-# LANGUAGE OverloadedStrings #-}
module Integration.WB.SEO
    ( -- * WB SEO Client
      WBClient(..)
    , WBApiClient(..)
    , WBSearchResult(..)

      -- * Search Depth
    , SearchDepth(..)
    , searchDepthToInt

      -- * SEO Operations
    , trackKeyword
    , getTrackedKeywords
    , getKeywordPosition

      -- * Parsing Functions
    , parseSearchResults
    , extractKeywordsFromCard
    , findArticlePosition
    , encodeUrlText

      -- * Types
    , WBSearchItem(..)
    , WBApiConfig(..)
    , WBApiError(..)
    ) where

import Control.Exception (try, SomeException)
import Data.ByteString (ByteString)
import Data.ByteString qualified as BS
import Data.ByteString.Lazy qualified as LBS
import Data.Char (ord)
import Data.List (find)
import Data.Text (Text)
import Data.Text qualified as T
import Data.Text.Encoding qualified as TEnc
import Data.Time (Day)
import Network.HTTP.Client (Request, Response(..), parseRequest, httpLbs)
import Network.HTTP.Client qualified as HTTP
import Network.HTTP.Types (statusCode)
import Text.HTML.TagSoup (parseTags, Tag(..), (~==), innerText)
import Text.HTML.TagSoup.Functions (fromTagOpen)

import Effect.AppEffect (AppE, liftIO, Eff)
import Effect.Error (AppError(..), throwError)
import Infra.HttpClient.Base (HttpClient(..), HttpClientConfig(..), defaultHttpClientConfig)
import Infra.Retry (RetryConfig(..), defaultRetryConfig, applyJitter)
import Domain.SEO
import Domain.Marketplace (Marketplace(..))

-- =============================================================================
-- WB SEO Client Types
-- =============================================================================

-- | WB SEO client interface for keyword operations
class WBClient m where
    getKeywordPosition :: Text -> Text -> m (Maybe Int)

-- | WB API client for SEO operations
data WBApiClient = WBApiClient
    { wbacManager :: HTTP.Manager
    , wbacConfig :: WBApiConfig
    }

-- | WB API configuration
data WBApiConfig = WBApiConfig
    { wbacBaseUrl :: Text
    , wbacTimeout :: Int  -- microseconds
    } deriving (Show, Eq)

-- | Default WB API configuration
defaultWBApiConfig :: WBApiConfig
defaultWBApiConfig = WBApiConfig
    { wbacBaseUrl = "https://catalog.wb.ru"
    , wbacTimeout = 30000000  -- 30s
    }

-- | Search depth options for WB catalog searches
data SearchDepth = Depth100 | Depth500 | Depth1000 | Depth10000
    deriving (Show, Eq)

-- | Convert search depth to integer
searchDepthToInt :: SearchDepth -> Int
searchDepthToInt Depth100 = 100
searchDepthToInt Depth500 = 500
searchDepthToInt Depth1000 = 1000
searchDepthToInt Depth10000 = 10000

-- | Single item in WB search results
data WBSearchItem = WBSearchItem
    { wbsiArticleId :: Text
    , wbsiPosition :: Int
    , wbsiName :: Maybe Text
    , wbsiBrand :: Maybe Text
    } deriving (Show, Eq)

-- | Raw search result from WB API
data WBSearchResult = WBSearchResult
    { wbsrKeyword :: Text
    , wbsrItems :: [WBSearchItem]
    , wbsrTotal :: Int
    } deriving (Show, Eq)

-- | WB API error types
data WBApiError
    = WBNetworkError String
    | WBHttpError Int Text
    | WBParseError String
    | WBNotFound
    deriving (Show, Eq)

-- =============================================================================
-- WB Client Implementation
-- =============================================================================

instance WBClient IO where
    getKeywordPosition keyword articleId = do
        result <- try $ fetchSearchResults keyword articleId
        case result of
            Right mbPos -> pure mbPos
            Left _ -> pure Nothing

-- | Fetch search results and find article position
fetchSearchResults :: Text -> Text -> IO (Maybe Int)
fetchSearchResults keyword articleId = do
    let url = buildSearchUrl keyword
    manager <- HTTP.newManager HTTP.defaultManagerSettings
    request <- parseRequest (T.unpack url)
    response <- HTTP.httpLbs request manager
    let body = HTTP.responseBody response
        items = parseSearchResults (LBS.toStrict body)
        position = findArticlePosition articleId items
    pure position
  where
    buildSearchUrl :: Text -> Text
    buildSearchUrl kw = T.concat
        [ "https://catalog.wb.ru/catalog?search="
        , TEnc.encodeUrlText kw
        ]

-- =============================================================================
-- Parsing Functions
-- =============================================================================

-- | Parse WB search results page to extract article positions
-- Returns list of (articleId, position) tuples
parseSearchResults :: ByteString -> [(Text, Int)]
parseSearchResults body = do
    let tags = parseTags body
        items = extractSearchItems tags
    items

-- | Extract search items from parsed HTML tags
extractSearchItems :: [Tag ByteString] -> [(Text, Int)]
extractSearchItems tags = go tags 1
  where
    go :: [Tag ByteString] -> Int -> [(Text, Int)]
    go [] _ = []
    go tags' pos = case findNextItem tags' of
        Nothing -> []
        Just (articleId, remaining) -> (articleId, pos) : go remaining (pos + 1)

    findNextItem :: [Tag ByteString] -> Maybe (Text, [Tag ByteString])
    findNextItem [] = Nothing
    findNextItem tags' = do
        -- Look for data-id or article link pattern
        let itemTag = find (\tag -> hasArticleId tag) tags'
        case itemTag of
            Nothing -> Nothing
            Just tag -> case tag of
                TagOpen "a" attrs -> do
                    href <- lookup "href" attrs
                    articleId <- extractArticleIdFromHref href
                    let remaining = dropWhile (\t -> not (isItemEnd t)) (tail (dropWhile (/= tag) tags'))
                    pure (articleId, remaining)
                _ -> findNextItem (tail tags')

    hasArticleId :: Tag ByteString -> Bool
    hasArticleId (TagOpen "a" attrs) = any (\(k, v) -> k == "data-id" || isArticleHref v) attrs
    hasArticleId _ = False

    isArticleHref :: ByteString -> Bool
    isArticleHref href = BS.isInfixOf "/catalog/" href && BS.isInfixOf "itm" href

    extractArticleIdFromHref :: ByteString -> Maybe Text
    extractArticleIdFromHref href = do
        let parts = BS.split (ord '/') href
            idPart = find (\p -> BS.isPrefixOf "itm" p && BS.length p > 3) parts
        TEnc.decodeUtf8 <$> idPart

    isItemEnd :: Tag ByteString -> Bool
    isItemEnd (TagClose "a") = True
    isItemEnd (TagOpen "div" _) = True
    isItemEnd _ = False

-- | Extract keywords from WB product card HTML
-- Keywords are typically found in meta tags, headings, and product descriptions
extractKeywordsFromCard :: ByteString -> [Text]
extractKeywordsFromCard body = do
    let tags = parseTags body
        metaKeywords = extractMetaKeywords tags
        headingKeywords = extractHeadingKeywords tags
        descriptionKeywords = extractDescriptionKeywords tags
    metaKeywords ++ headingKeywords ++ descriptionKeywords

-- | Extract keywords from meta description tag
extractMetaKeywords :: [Tag ByteString] -> [Text]
extractMetaKeywords tags = do
    let metaTags = filter (~== TagOpen "meta" []) tags
        content = map (\t -> fromTagOpen t "content") metaTags
        keywords = filter (not . BS.null) content
    map TEnc.decodeUtf8 keywords

-- | Extract text from heading tags
extractHeadingKeywords :: [Tag ByteString] -> [Text]
extractHeadingKeywords tags = do
    let headingTags = filter isHeadingTag tags
        texts = map innerText headingTags
        filtered = filter (not . T.null) texts
    filtered
  where
    isHeadingTag :: Tag ByteString -> Bool
    isHeadingTag (TagOpen "h1" _) = True
    isHeadingTag (TagOpen "h2" _) = True
    isHeadingTag (TagOpen "h3" _) = True
    isHeadingTag _ = False

-- | Extract keywords from product description
extractDescriptionKeywords :: [Tag ByteString] -> [Text]
extractDescriptionKeywords tags = do
    let descriptionDiv = findDescriptionDiv tags
        keywords = case descriptionDiv of
            Nothing -> []
            Just divTags -> extractTextFromDiv divTags
    keywords

-- | Find the product description div
findDescriptionDiv :: [Tag ByteString] -> Maybe [Tag ByteString]
findDescriptionDiv [] = Nothing
findDescriptionDiv tags = case filter (~== TagOpen "div" [("class", "product-description")) tags of
    (d:_) -> Just $ takeWhile (not . isClosingDiv) (tail (dropWhile (/= d) tags))
    [] -> Nothing
  where
    isClosingDiv :: Tag ByteString -> Bool
    isClosingDiv (TagClose "div") = True
    isClosingDiv _ = False

-- | Extract text content from a div
extractTextFromDiv :: [Tag ByteString] -> [Text]
extractTextFromDiv tags = do
    let text = T.strip (innerText tags)
        keywords = T.words text
    keywords

-- =============================================================================
-- SEO Operations
-- =============================================================================

-- | Track keyword position for WB article
trackKeyword
    :: (WBClient m, SEORepository m)
    => Text              -- keyword
    -> Text              -- article ID
    -> m (Maybe KeywordPosition)
trackKeyword keyword articleId = do
    position <- getKeywordPosition keyword articleId
    case position of
        Nothing -> pure Nothing
        Just pos -> do
            now <- liftIO getCurrentDay
            saveKeywordPosition keyword articleId pos now
            pure $ Just KeywordPosition
                { kpId = 0  -- Will be set by repository
                , kpKeyword = keyword
                , kpArticleId = articleId
                , kpMarketplace = Wildberries
                , kpPosition = pos
                , kpDate = now
                }

-- | Get all tracked keywords for article
getTrackedKeywords
    :: (SEORepository m)
    => Text              -- article ID
    -> Marketplace       -- must be Wildberries
    -> m [SeoKeyword]
getTrackedKeywords articleId marketplace = do
    if marketplace /= Wildberries
        then pure []
        else getKeywordsByArticle articleId

-- | Find article position in search results
findArticlePosition :: Text -> [(Text, Int)] -> Maybe Int
findArticlePosition articleId items = snd <$> find (\(aid, _) -> aid == articleId) items

-- =============================================================================
-- Helper Functions
-- =============================================================================

-- | Encode text for URL
encodeUrlText :: Text -> Text
encodeUrlText = T.pack . escapeUrlChars . T.unpack
  where
    escapeUrlChars :: String -> String
    escapeUrlChars [] = []
    escapeUrlChars (c:cs) = case c of
        ' ' -> "%20" ++ escapeUrlChars cs
        '&' -> "%26" ++ escapeUrlChars cs
        '=' -> "%3D" ++ escapeUrlChars cs
        '?' -> "%3F" ++ escapeUrlChars cs
        _ -> c : escapeUrlChars cs

-- | Get current day (placeholder - would use time library)
getCurrentDay :: IO Day
getCurrentDay = undefined  -- Would use Data.Time.getCurrentTime and utctDay

-- | Placeholder for SEORepository constraint
-- In real implementation, this would be defined in a repository module
class SEORepository m where
    saveKeywordPosition :: Text -> Text -> Int -> Day -> m (Maybe KeywordPosition)
    getKeywordsByArticle :: Text -> m [SeoKeyword]

-- =============================================================================
-- WB API Client
-- =============================================================================

-- | Create WB API client
newWBApiClient :: HTTP.Manager -> WBApiConfig -> WBApiClient
newWBApiClient manager config = WBApiClient
    { wbacManager = manager
    , wbacConfig = config
    }

-- | Make request to WB catalog API
wbCatalogRequest
    :: WBApiClient
    -> Text
    -> IO (Either WBApiError (Response LBS.ByteString))
wbCatalogRequest client path = do
    let url = T.concat [wbacBaseUrl (wbacConfig client), path]
    result <- try $ do
        request <- parseRequest (T.unpack url)
        response <- HTTP.httpLbs request (wbacManager client)
        pure response
    case result of
        Right resp -> pure $ Right resp
        Left ex -> pure $ Left $ WBNetworkError (show (ex :: SomeException))

-- | Get search results with specific depth
getSearchResultsWithDepth :: WBApiClient -> Text -> SearchDepth -> IO (Either WBApiError [WBSearchItem])
getSearchResultsWithDepth client keyword depth = do
    let path = T.concat
            [ "/catalog/v2/search?query="
            , encodeUrlText keyword
            , "&depth="
            , T.pack (show (searchDepthToInt depth))
            ]
    result <- wbCatalogRequest client path
    case result of
        Left err -> pure $ Left err
        Right resp -> do
            let status = statusCode (HTTP.responseStatus resp)
            if status /= 200
                then pure $ Left $ WBHttpError status "Search failed"
                else pure $ parseSearchResponse (HTTP.responseBody resp)

-- | Parse WB search API response
parseSearchResponse :: LBS.ByteString -> Either WBApiError [WBSearchItem]
parseSearchResponse _body = undefined  -- Would parse JSON response

-- =============================================================================
-- Instance Definitions
-- =============================================================================

instance WBClient WBApiClient where
    getKeywordPosition keyword articleId = do
        result <- getSearchResultsWithDepth undefined keyword Depth100
        case result of
            Left _ -> pure Nothing
            Right items -> pure $ findPosition articleId items
      where
        findPosition :: Text -> [WBSearchItem] -> Maybe Int
        findPosition aid items = do
            item <- find (\i -> wbsiArticleId i == aid) items
            pure $ wbsiPosition item
