-- Test suite for wbhelper
module Main where

import Test.Hspec
import App.Hello
import qualified Data.Text as T
import Domain.MarginSpec
import Domain.PriceAnalysisSpec

main :: IO ()
main = hspec $ do
  describe "App.Hello" $ do
    it "returns Hello World JSON response" $ do
      helloResponse `shouldBe` "{\"message\":\"Hello World\"}"

    it "has correct JSON structure" $ do
      helloResponse `shouldContain` "Hello World"
      helloResponse `shouldContain` "message"

    it "helloMessage is correct Text" $ do
      T.pack "Hello World" `shouldBe` helloMessage

  Domain.MarginSpec.spec
  Domain.PriceAnalysisSpec.spec
