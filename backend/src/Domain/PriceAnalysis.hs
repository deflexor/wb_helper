-- Price gap analysis functions - Pure domain logic
module Domain.PriceAnalysis where

-- | Price gap: competitor price - our price
-- Positive means competitor is more expensive (we undercut)
-- Negative means competitor is cheaper (we are overpriced)
calcPriceGap :: Double -> Double -> Double
calcPriceGap competitorPrice ourPrice = competitorPrice - ourPrice

-- | Gap percentage: (gap / competitor price) * 100
-- Returns Nothing for invalid inputs (zero competitor price)
calcGapPercentage :: Double -> Double -> Maybe Double
calcGapPercentage competitorPrice gap
  | competitorPrice <= 0 = Nothing
  | otherwise             = Just $ (gap / competitorPrice) * 100

-- | Price recommendation based on gap analysis
data PriceRecommendation = Undercut | Match | Maintain | Raise
    deriving (Show, Eq)

-- | Threshold for price recommendation (5%)
recommendationThreshold :: Double
recommendationThreshold = 5.0

-- | Analyze if we should undercut, match, or maintain
-- Threshold: 5% gap triggers action
recommendPrice :: Double -> Double -> PriceRecommendation
recommendPrice competitorPrice ourPrice
  | gapPercent > recommendationThreshold  = Undercut
  | gapPercent < (-recommendationThreshold) = Raise
  | gapPercent >= 0                        = Match
  | otherwise                              = Maintain
  where
    gap = calcPriceGap competitorPrice ourPrice
    gapPercent = case calcGapPercentage competitorPrice gap of
                   Just p  -> p
                   Nothing -> 0
