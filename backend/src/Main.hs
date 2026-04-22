-- | Main entry point
module Main where

import App (runApp)
import Config (Config(..))

main :: IO ()
main = runApp $ Config 8080 "0.0.0.0"