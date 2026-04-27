-- Marketplace enum for SEO domain
-- Distinguishes between Wildberries and Ozon for keyword/cluster tracking
module Domain.Marketplace
    ( Marketplace(..)
    , parseMarketplace
    , marketplaceToText
    ) where

-- | Marketplace identifier for SEO tables
-- Used to track keyword rankings, clusters, and competitor data per marketplace
data Marketplace = Wildberries | Ozon
    deriving (Eq, Show, Read)

-- | Parse marketplace from lowercase text (for DB storage)
parseMarketplace :: String -> Maybe Marketplace
parseMarketplace "wildberries" = Just Wildberries
parseMarketplace "ozon"        = Just Ozon
parseMarketplace _             = Nothing

-- | Convert marketplace to lowercase text (for DB storage)
marketplaceToText :: Marketplace -> String
marketplaceToText Wildberries = "wildberries"
marketplaceToText Ozon        = "ozon"