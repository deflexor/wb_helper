cabal-version: 3.0
name: auth-test
version: 0.1.0.0
synopsis: Test auth modules
description: Test auth modules in isolation
build-type: Simple

common shared
  default-language: GHC2021
  ghc-options: -Wall

library
  hs-source-dirs: src
  exposed-modules: Auth.JWT, Auth.Middleware, Auth.Session
  build-depends:
    base >= 4.17 && < 5
    , text
    , bytestring
    , aeson
    , time
    , cryptohash-sha256
    , base64-bytestring
    , scrypt
    , random

test-suite spec
  type: exitcode-stdio-1.0
  main-is: Spec.hs
  hs-source-dirs: test
  other-modules: Auth.JWTSpec
  build-depends:
    auth-test
    , hspec
    , text
    , time
    , aeson