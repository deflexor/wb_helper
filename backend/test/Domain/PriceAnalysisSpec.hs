-- Tests for Domain.PriceAnalysis
module Domain.PriceAnalysisSpec where

import Test.Hspec
import Domain.PriceAnalysis

spec :: Spec
spec = do
  describe "calcPriceGap" $ do
    it "calculates positive gap when competitor is more expensive" $ do
      let result = calcPriceGap 120.0 100.0
      result `shouldBe` 20.0

    it "calculates negative gap when we are more expensive" $ do
      let result = calcPriceGap 100.0 120.0
      result `shouldBe` (-20.0)

    it "returns zero when prices are equal" $ do
      let result = calcPriceGap 100.0 100.0
      result `shouldBe` 0.0

  describe "calcGapPercentage" $ do
    it "calculates correct gap percentage" $ do
      let result = calcGapPercentage 100.0 10.0
      result `shouldBe` Just 10.0

    it "returns Nothing for zero competitor price" $ do
      let result = calcGapPercentage 0.0 10.0
      result `shouldBe` Nothing

    it "calculates negative percentage when gap is negative" $ do
      let result = calcGapPercentage 100.0 (-10.0)
      result `shouldBe` Just (-10.0)

    it "handles 50% gap correctly" $ do
      let result = calcGapPercentage 100.0 50.0
      result `shouldBe` Just 50.0

  describe "PriceRecommendation" $ do
    it "Undercut when gap is greater than 5%" $ do
      let result = recommendPrice 100.0 90.0  -- 10% undercut
      result `shouldBe` Undercut

    it "Match when gap is between 0 and 5%" $ do
      let result = recommendPrice 100.0 97.0  -- 3% undercut
      result `shouldBe` Match

    it "Maintain when gap is between -5 and 0%" $ do
      let result = recommendPrice 100.0 103.0  -- 3% higher
      result `shouldBe` Maintain

    it "Raise when gap is less than -5%" $ do
      let result = recommendPrice 100.0 110.0  -- 10% higher
      result `shouldBe` Raise

    it "Match when exactly at 5% undercut" $ do
      let result = recommendPrice 100.0 95.0  -- 5% undercut
      result `shouldBe` Match

    it "Maintain when exactly at -5% higher" $ do
      let result = recommendPrice 100.0 105.0  -- 5% higher
      result `shouldBe` Maintain
