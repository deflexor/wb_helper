-- Tests for Domain.Margin
module Domain.MarginSpec where

import Test.Hspec
import Domain.Margin

spec :: Spec
spec = do
  describe "calcMargin" $ do
    it "calculates correct margin percentage for positive values" $ do
      let result = calcMargin 100.0 70.0
      result `shouldBe` Just 30.0

    it "returns Nothing for zero price" $ do
      let result = calcMargin 0.0 50.0
      result `shouldBe` Nothing

    it "returns Nothing for negative price" $ do
      let result = calcMargin (-10.0) 50.0
      result `shouldBe` Nothing

    it "returns Nothing for negative cost" $ do
      let result = calcMargin 100.0 (-50.0)
      result `shouldBe` Nothing

    it "returns Just 0 when cost exceeds price (loss)" $ do
      let result = calcMargin 50.0 70.0
      result `shouldBe` Just 0.0

    it "calculates 50% margin correctly" $ do
      let result = calcMargin 100.0 50.0
      result `shouldBe` Just 50.0

  describe "calcProfit" $ do
    it "calculates correct profit for valid values" $ do
      let result = calcProfit 100.0 70.0
      result `shouldBe` 30.0

    it "returns negative when cost exceeds price" $ do
      let result = calcProfit 50.0 70.0
      result `shouldBe` (-20.0)

    it "returns zero when price equals cost" $ do
      let result = calcProfit 100.0 100.0
      result `shouldBe` 0.0

  describe "calcRequiredPrice" $ do
    it "calculates correct price for 20% margin" $ do
      let result = calcRequiredPrice 80.0 20.0
      result `shouldBe` Just 100.0

    it "returns Nothing for zero cost" $ do
      let result = calcRequiredPrice 0.0 20.0
      result `shouldBe` Nothing

    it "returns Nothing for negative cost" $ do
      let result = calcRequiredPrice (-50.0) 20.0
      result `shouldBe` Nothing

    it "returns Nothing for negative target margin" $ do
      let result = calcRequiredPrice 80.0 (-10.0)
      result `shouldBe` Nothing

    it "returns Nothing for 100% margin (impossible)" $ do
      let result = calcRequiredPrice 80.0 100.0
      result `shouldBe` Nothing

    it "calculates correct price for 30% margin" $ do
      let result = calcRequiredPrice 70.0 30.0
      result `shouldBe` Just 100.0
