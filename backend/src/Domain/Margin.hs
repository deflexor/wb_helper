-- Margin calculation functions - Pure domain logic
module Domain.Margin where

import Data.Ratio ((%))

-- | Calculate margin percentage: ((price - cost) / price) * 100
-- Returns Nothing for invalid inputs (zero price, negative prices)
calcMargin :: Double -> Double -> Maybe Double
calcMargin price cost
  | price <= 0         = Nothing
  | cost < 0           = Nothing
  | price < cost       = Just 0  -- Loss making, but technically 0 margin
  | otherwise          = Just $ ((price - cost) / price) * 100

-- | Calculate profit: price - cost
-- Can be negative if cost > price
calcProfit :: Double -> Double -> Double
calcProfit price cost = price - cost

-- | Calculate required price for target margin
-- Given cost and target margin%, calculate selling price
-- Returns Nothing for invalid inputs (negative margin, zero/negative cost)
calcRequiredPrice :: Double -> Double -> Maybe Double
calcRequiredPrice cost targetMargin
  | cost <= 0           = Nothing
  | targetMargin < 0     = Nothing
  | targetMargin >= 100  = Nothing
  | otherwise            = Just $ cost / (1 - targetMargin / 100)
