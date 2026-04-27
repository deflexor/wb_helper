-- Migration: Add marketplace column to all SEO tables
-- Date: 2026-04-27
-- Description: Adds marketplace enum (wildberries, ozon) to SEO tables for multi-marketplace support

-- =============================================================================
-- UPGRADE: Add marketplace column
-- =============================================================================

-- Add marketplace column to KeywordTrack
ALTER TABLE keyword_track ADD COLUMN marketplace VARCHAR(20) NOT NULL DEFAULT 'wildberries';

-- Add marketplace column to DroppedKeyword
ALTER TABLE dropped_keyword ADD COLUMN marketplace VARCHAR(20) NOT NULL DEFAULT 'wildberries';

-- Add marketplace column to KeywordCluster
ALTER TABLE keyword_cluster ADD COLUMN marketplace VARCHAR(20) NOT NULL DEFAULT 'wildberries';

-- Add marketplace column to ClusterKeyword
ALTER TABLE cluster_keyword ADD COLUMN marketplace VARCHAR(20) NOT NULL DEFAULT 'wildberries';

-- Add marketplace column to CompetitorKeywords
ALTER TABLE competitor_keywords ADD COLUMN marketplace VARCHAR(20) NOT NULL DEFAULT 'wildberries';

-- =============================================================================
-- INDEXES: Optimize queries by marketplace
-- =============================================================================

-- Index for efficient queries filtering by marketplace and keyword_id
CREATE INDEX idx_keyword_track_marketplace_keyword ON keyword_track (marketplace, keyword_id);
CREATE INDEX idx_dropped_keyword_marketplace_keyword ON dropped_keyword (marketplace, keyword_id);
CREATE INDEX idx_keyword_cluster_marketplace_keyword ON keyword_cluster (marketplace, keyword_id);
CREATE INDEX idx_cluster_keyword_marketplace_keyword ON cluster_keyword (marketplace, keyword_id);
CREATE INDEX idx_competitor_keywords_marketplace_keyword ON competitor_keywords (marketplace, keyword_id);

-- =============================================================================
-- ROLLBACK: Remove marketplace column
-- =============================================================================

-- Drop indexes first (in reverse order of creation)
DROP INDEX IF EXISTS idx_competitor_keywords_marketplace_keyword;
DROP INDEX IF EXISTS idx_cluster_keyword_marketplace_keyword;
DROP INDEX IF EXISTS idx_keyword_cluster_marketplace_keyword;
DROP INDEX IF EXISTS idx_dropped_keyword_marketplace_keyword;
DROP INDEX IF EXISTS idx_keyword_track_marketplace_keyword;

-- Remove marketplace column from all tables
ALTER TABLE competitor_keywords DROP COLUMN IF EXISTS marketplace;
ALTER TABLE cluster_keyword DROP COLUMN IF EXISTS marketplace;
ALTER TABLE keyword_cluster DROP COLUMN IF EXISTS marketplace;
ALTER TABLE dropped_keyword DROP COLUMN IF EXISTS marketplace;
ALTER TABLE keyword_track DROP COLUMN IF EXISTS marketplace;