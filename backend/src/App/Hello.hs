{-# LANGUAGE OverloadedStrings #-}
-- | Hello World module
module App.Hello where

import Data.Text (Text)

-- | JSON response for Hello endpoint
helloResponse :: String
helloResponse = "{\"message\":\"Hello World\"}"

-- | Create hello message
helloMessage :: Text
helloMessage = "Hello World"