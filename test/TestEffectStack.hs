{-# LANGUAGE DataKinds #-}
{-# LANGUAGE TypeOperators #-}
module TestEffectStack where

import Effectful
import Effectful.State.Static.Local
import Effectful.Reader.Static
import Effectful.Error.Static

data AppError = AppError String deriving Show

-- Computation that only uses State
computation :: (State Int :> es) => Eff es Int
computation = do
  n <- get
  pure n

-- Test - run with just State
test1 :: (Int, Int)
test1 = runPureEff $ runState 5 computation

-- Result
main :: IO ()
main = do
  print test1