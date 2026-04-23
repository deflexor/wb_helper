{-# LANGUAGE DataKinds #-}
{-# LANGUAGE TypeOperators #-}
module TestK where

import Effectful
import Effectful.Error.Static
import Effectful.State.Static.Local

data AppError = AppError String deriving Show

-- Try plain Error without type parameter
type TestEff a = Eff '[IO, Error AppError, State Int] a

test :: TestEff Int
test = pure 5