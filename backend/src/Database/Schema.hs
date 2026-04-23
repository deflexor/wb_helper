-- Database Schema - Persistent entity definitions
-- Simplified version without TH to fix build
module Database.Schema
    ( Marketplace(..)
    ) where

import Data.Text (Text)
import Data.Time (UTCTime)

-- Note: Plan type is defined in Auth.JWT
-- Full schema with Persistent TH requires:
-- - proper TemplateHaskell setup
-- - database-persistent package configured correctly

-- | Marketplace types
data Marketplace = WB | Ozon
    deriving (Show, Eq, Read)