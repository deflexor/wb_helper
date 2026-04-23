-- | Tests for Auth.Middleware - Route protection middleware
module Auth.MiddlewareSpec where

import Test.Hspec
import Data.Text (Text)
import Data.Time (getCurrentTime, addHours)

import Auth.Middleware
import Auth.JWT

-- | Test spec
spec :: Spec
spec = do
    describe "AuthResult" $ do
        it "AuthSuccess contains user id and plan" $ do
            let result = AuthSuccess 1 Paid
            case result of
                AuthSuccess uid plan -> do
                    uid `shouldBe` 1
                    plan `shouldBe` Paid
                AuthFailure _ -> expectationFailure "Expected AuthSuccess"

        it "AuthFailure contains error" $ do
            let result = AuthFailure AuthUnauthorized
            case result of
                AuthSuccess _ _ -> expectationFailure "Expected AuthFailure"
                AuthFailure err -> err `shouldBe` AuthUnauthorized

    describe "requirePaid middleware" $ do
        it "allows paid users through" $ do
            let result = requirePaid (AuthSuccess 1 Paid)
            case result of
                AuthSuccess _ _ -> pure ()
                AuthFailure _ -> expectationFailure "Expected success for Paid user"

        it "blocks free users" $ do
            let result = requirePaid (AuthSuccess 1 Free)
            case result of
                AuthSuccess _ _ -> expectationFailure "Expected failure for Free user"
                AuthFailure AuthUnauthorized -> pure ()
                AuthFailure _ -> expectationFailure "Expected AuthUnauthorized"

        it "passes through auth failures" $ do
            let result = requirePaid (AuthFailure AuthMissing)
            case result of
                AuthFailure AuthMissing -> pure ()
                _ -> expectationFailure "Expected AuthMissing to pass through"

    describe "requireFree middleware" $ do
        it "allows free users through" $ do
            let result = requireFree (AuthSuccess 1 Free)
            case result of
                AuthSuccess _ _ -> pure ()
                AuthFailure _ -> expectationFailure "Expected success for Free user"

        it "blocks paid users for free-only routes" $ do
            let result = requireFree (AuthSuccess 1 Paid)
            case result of
                AuthSuccess _ _ -> expectationFailure "Expected failure for Paid user"
                AuthFailure AuthUnauthorized -> pure ()
                AuthFailure _ -> expectationFailure "Expected AuthUnauthorized"

    describe "validateApiKey" $ do
        it "accepts valid 64-char hex key" $ do
            let key = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef" :: Text
            result <- validateApiKey key
            case result of
                Right (uid, plan) -> do
                    uid `shouldBe` 1
                    plan `shouldBe` Paid
                Left _ -> expectationFailure "Expected valid key"

        it "rejects key shorter than 64 chars" $ do
            let key = "0123456789abcdef" :: Text
            result <- validateApiKey key
            result `shouldSatisfy` isLeft

        it "rejects key with non-hex characters" $ do
            let key = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdeg" :: Text
            result <- validateApiKey key
            result `shouldSatisfy` isLeft

-- | Helper
isLeft :: Either a b -> Bool
isLeft (Left _) = True
isLeft (Right _) = False