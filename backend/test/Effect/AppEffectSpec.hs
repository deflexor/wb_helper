-- | Tests for AppEffect - Main effect stack
module Effect.AppEffectSpec where

import Test.Hspec
import Effectful
import Effectful.State.Static.Local (State, evalState, get, put)
import Effectful.Reader.Static (runReader, ask)

import Effect.AppEffect
import Effect.State (AppState(..), emptyAppState)
import Config (Config(..))

-- | Test spec
spec :: Spec
spec = do
  describe "AppState" $ do
    it "creates empty app state" $ do
      let state = emptyAppState (Config 8080 "localhost")
      appConfig state `shouldBe` Config 8080 "localhost"

  describe "AppE constraint" $ do
    it "can be used in function signatures" $ do
      let testFunc :: AppE es => Eff es Int
          testFunc = pure 42
          result = runPureEff $ evalState (0 :: Int) $ runReader (Config 8080 "localhost") $ testFunc
      result `shouldBe` (42 :: Int)

    it "works with State effect" $ do
      let testWithState :: AppE es => Eff es Int
          testWithState = do
            n <- get
            put (n + 1)
            pure n
          result = runPureEff $ evalState (5 :: Int) $ runReader (Config 8080 "localhost") $ testWithState
      result `shouldBe` (5, 6 :: (Int, Int))