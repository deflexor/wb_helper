-- | Tests for Auth.JWT - JWT generation and validation
module Auth.JWTSpec where

import Test.Hspec
import Data.Text (Text)
import Data.Time (UTCTime, addDays, addHours, getCurrentTime)
import qualified Data.Text as T

import Auth.JWT

-- | Helper to create test claims
mkTestClaims :: UserId -> Plan -> UTCTime -> JWTClaims
mkTestClaims uid plan exp = JWTClaims
    { jscUserId = uid
    , jscEmail = "test@example.com"
    , jscSubscription = plan
    , jscExp = exp
    }

-- | Test spec
spec :: Spec
spec = do
    describe "JWT Generation" $ do
        it "generates a valid JWT token" $ do
            now <- getCurrentTime
            let claims = mkTestClaims 1 Free (addDays 7 now)
                secret = "test-secret-key" :: Text
                token = generateJWT secret claims
            -- Token should be non-empty
            T.null token `shouldBe` False
            -- Token should have 3 parts separated by dots
            length (T.splitOn "." token) `shouldBe` 3

        it "generates different tokens for different users" $ do
            now <- getCurrentTime
            let claims1 = mkTestClaims 1 Free (addDays 7 now)
                claims2 = mkTestClaims 2 Free (addDays 7 now)
                secret = "test-secret-key" :: Text
                token1 = generateJWT secret claims1
                token2 = generateJWT secret claims2
            token1 `shouldNotBe` token2

        it "generates different tokens for different secrets" $ do
            now <- getCurrentTime
            let claims = mkTestClaims 1 Free (addDays 7 now)
                token1 = generateJWT "secret1" claims
                token2 = generateJWT "secret2" claims
            token1 `shouldNotBe` token2

    describe "JWT Validation" $ do
        it "validates a correctly signed token" $ do
            now <- getCurrentTime
            let claims = mkTestClaims 1 Paid (addDays 7 now)
                secret = "test-secret-key" :: Text
                token = generateJWT secret claims
                result = validateJWT secret token
            case result of
                Right validated -> do
                    jscUserId validated `shouldBe` 1
                    jscSubscription validated `shouldBe` Paid
                    jscEmail validated `shouldBe` "test@example.com"
                Left err -> expectationFailure $ "Expected valid token, got: " ++ show err

        it "rejects token with wrong secret" $ do
            now <- getCurrentTime
            let claims = mkTestClaims 1 Free (addDays 7 now)
                token = generateJWT "correct-secret" claims
                result = validateJWT "wrong-secret" token
            case result of
                Left InvalidSignature -> pure ()
                _ -> expectationFailure "Expected InvalidSignature error"

        it "rejects malformed token" $ do
            let result = validateJWT "secret" ("not.a.valid.token" :: Text)
            case result of
                Left MalformedToken -> pure ()
                _ -> expectationFailure "Expected MalformedToken error"

        it "rejects empty token" $ do
            let result = validateJWT "secret" ("" :: Text)
            case result of
                Left MalformedToken -> pure ()
                _ -> expectationFailure "Expected MalformedToken error"

    describe "JWT Expiration" $ do
        it "accepts token that hasn't expired" $ do
            now <- getCurrentTime
            let claims = mkTestClaims 1 Free (addHours 1 now)  -- Expires in 1 hour
                secret = "test-secret-key" :: Text
                token = generateJWT secret claims
                result = validateJWT secret token
            case result of
                Right _ -> pure ()
                Left err -> expectationFailure $ "Expected valid token, got: " ++ show err

    describe "JWTClaims structure" $ do
        it "preserves all claim fields" $ do
            now <- getCurrentTime
            let claims = JWTClaims
                    { jscUserId = 42
                    , jscEmail = "user@marketplace.test"
                    , jscSubscription = Paid
                    , jscExp = addDays 30 now
                    }
                secret = "test-secret-key" :: Text
                token = generateJWT secret claims
            case validateJWT secret token of
                Right validated -> do
                    jscUserId validated `shouldBe` 42
                    jscEmail validated `shouldBe` "user@marketplace.test"
                    jscSubscription validated `shouldBe` Paid
                Left err -> expectationFailure $ "Expected valid token, got: " ++ show err