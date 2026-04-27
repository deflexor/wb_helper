# Feature: SEO Module — Keyword Intelligence System

## Overview

**Marpla SEO Module** provides comprehensive keyword intelligence for Wildberries product cards:
- Track keyword positions in search results
- Detect **dropped keywords** (lost traffic) over time
- **Cluster keywords** by semantic similarity
- **Competitor keyword analysis** — extract all keywords from competitor products
- Fast semantic collection (1 minute for full keyword set)
- Keyword marking and labeling system

---

## Implementation Prompt

### Context Loading

Before implementing, load the following context files:
```
@.opencode/context/core/standards/code-quality.md
@.opencode/context/core/standards/api-design.md
```

Also load reference files:
- Backend: `backend/src/Domain/*.hs`, `backend/src/AI/*.hs`
- Frontend: `frontend/src/pages/SEOContentPage.tsx`, `frontend/src/hooks/useSeoContent.ts`

---

### 1. Backend Implementation

#### 1.1 Database Schema

Create new tables in `backend/src/Database/Schema.hs`:

```haskell
-- Keyword tracking
KeywordTrack
    keyword Text
    articleId Text
    marketplace Marketplace
    position Int Maybe
    searchDate Day
    createdAt UTCTime
    deriving Eq Show

-- Dropped keywords (lost search visibility)
DroppedKeyword
    keyword Text
    articleId Text
    marketplace Marketplace
    lastSeenDate Day
    droppedDate Day
    previousPosition Int
    deriving Eq Show

-- Keyword clusters
KeywordCluster
    clusterId Text
    clusterName Text
    articleId Text
    marketplace Marketplace
    createdAt UTCTime
    deriving Eq Show

ClusterKeyword
    clusterId Text
    keyword Text
    similarityScore Double
    deriving Eq Show
```

#### 1.2 New API Endpoints

Add to `backend/src/Api/Routes.hs`:

```haskell
-- Keyword Position Tracking
GET    /seo/keywords/tracking          -- List tracked keywords
POST   /seo/keywords/tracking           -- Add keyword to tracking
DELETE /seo/keywords/tracking/:id       -- Remove from tracking
GET    /seo/keywords/positions          -- Get position history

-- Dropped Keywords
GET    /seo/keywords/dropped            -- List dropped keywords
POST   /seo/keywords/dropped/check      -- Run dropped keyword detection

-- Keyword Clustering
GET    /seo/keywords/clusters           -- List keyword clusters
POST   /seo/keywords/clusters           -- Create cluster from keywords
GET    /seo/keywords/clusters/:id/keywords  -- Get keywords in cluster

-- Competitor Analysis
POST   /seo/competitors/keywords        -- Extract keywords from competitor article
GET    /seo/competitors/:articleId/keywords  -- Get competitor keywords

-- Keyword Collection
POST   /seo/keywords/collect            -- Collect all keywords for article
```

#### 1.3 Domain Logic

Create `backend/src/Domain/SEO.hs`:

```haskell
module Domain.SEO where

-- Keyword position data
data KeywordPosition = KeywordPosition
    { kpKeyword    :: Text
    , kpArticleId  :: Text
    , kpPosition   :: Int
    , kpDate       :: Day
    } deriving (Eq, Show)

-- Dropped keyword detection
data DroppedKeyword = DroppedKeyword
    { dkKeyword           :: Text
    , dkArticleId         :: Text
    , dkLastSeen          :: Day
    , dkDroppedAt         :: Day
    , dkPreviousPosition  :: Int
    } deriving (Eq, Show)

-- Semantic keyword cluster
data KeywordCluster = KeywordCluster
    { clusterId      :: Text
    , clusterName    :: Text
    , articleId      :: Text
    , keywords       :: [ClusterKeyword]
    } deriving (Eq, Show)

data ClusterKeyword = ClusterKeyword
    { ckKeyword          :: Text
    , ckSimilarityScore  :: Double
    } deriving (Eq, Show)

-- Competitor keyword analysis
data CompetitorKeywords = CompetitorKeywords
    { ckArticleId   :: Text
    , ckKeywords    :: [Text]
    , ckCollectedAt :: UTCTime
    } deriving (Eq, Show)
```

#### 1.4 WB API Integration

Create `backend/src/Integration/WB/SEO.hs`:

```haskell
module Integration.WB.SEO where

-- Get keyword position for article in search results
getKeywordPosition
    :: (WBClient m)
    => Text         -- search query/keyword
    -> Text         -- article ID
    -> m (Maybe Int) -- position or Nothing if not found

-- Parse search results page to extract keyword positions
parseSearchResults :: ByteString -> [(Text, Int)] -- [(articleId, position)]

-- Extract keywords from product card
extractKeywordsFromCard :: ByteString -> [Text]

-- Search depth: up to 100 pages (10,000 positions)
data SearchDepth = Depth100 | Depth500 | Depth1000 | Depth10000
```

#### 1.5 AI Integration for Keyword Clustering

Extend `backend/src/AI/OpenRouter.hs` with semantic similarity:

```haskell
-- Cluster keywords by semantic similarity using AI
clusterKeywords
    :: (AI m)
    => [Text]              -- input keywords
    -> m [KeywordCluster]  -- grouped clusters

-- Detect dropped keywords using historical analysis
detectDroppedKeywords
    :: (AI m)
    => Text              -- article ID
    -> m [DroppedKeyword]

-- Generate keyword suggestions based on competitor analysis
generateKeywordSuggestions
    :: (AI m)
    => [Text]            -- competitor keywords
    -> Text              -- product category
    -> m [Text]          -- suggested new keywords
```

---

### 2. Frontend Implementation

#### 2.1 New Pages/Routes

Add to `frontend/src/router.tsx`:

```typescript
// SEO Module pages
const SEODashboard = lazy(() => import('@/pages/seo/SEODashboardPage'));
const KeywordTracking = lazy(() => import('@/pages/seo/KeywordTrackingPage'));
const DroppedKeywords = lazy(() => import('@/pages/seo/DroppedKeywordsPage'));
const KeywordClusters = lazy(() => import('@/pages/seo/KeywordClustersPage'));
const CompetitorAnalysis = lazy(() => import('@/pages/seo/CompetitorAnalysisPage'));

// Routes
{ path: '/seo', element: <SEODashboard /> },
{ path: '/seo/keywords/tracking', element: <KeywordTracking /> },
{ path: '/seo/keywords/dropped', element: <DroppedKeywords /> },
{ path: '/seo/keywords/clusters', element: <KeywordClusters /> },
{ path: '/seo/competitors', element: <CompetitorAnalysis /> },
```

#### 2.2 Page Components

**SEODashboardPage.tsx** — Overview with:
- Keyword position trends chart (line chart)
- Dropped keywords count widget
- Top performing keywords table
- Quick actions: Add keyword, Check dropped, Create cluster

**KeywordTrackingPage.tsx** — Tracking management:
- Table with columns: Keyword, Article, Current Position, Change, Last Updated
- Filters: by article, by date range, by position range
- Add keyword form: keyword input + article selector
- Position history chart on row click

**DroppedKeywordsPage.tsx** — Lost traffic detection:
- Alert-style list of dropped keywords
- Before/after position comparison
- "Recover" action — suggests keywords to re-add
- Historical trend of drops over time

**KeywordClustersPage.tsx** — Semantic grouping:
- Cluster cards with keyword pills
- Create cluster: select keywords → AI clusters them
- Merge/split clusters manually
- Export cluster as CSV

**CompetitorAnalysisPage.tsx** — Spy on competitors:
- Input: competitor article ID
- Shows: all keywords competitor ranks for
- Position comparison table
- "Find gaps" — keywords competitor has that you don't

#### 2.3 Hooks

```typescript
// hooks/useKeywordTracking.ts
useKeywordTracking(filters?: KeywordFilters)
  -> { keywords: KeywordPosition[], isLoading, addKeyword, removeKeyword }

// hooks/useDroppedKeywords.ts
useDroppedKeywords(articleId?: string)
  -> { dropped: DroppedKeyword[], isLoading, checkForDrops }

// hooks/useKeywordClusters.ts
useKeywordClusters()
  -> { clusters: KeywordCluster[], createCluster, mergeClusters }

// hooks/useCompetitorKeywords.ts
useCompetitorKeywords(articleId: string)
  -> { keywords: CompetitorKeyword[], isLoading, collectKeywords }
```

#### 2.4 UI Components

Create in `frontend/src/components/seo/`:

```
SEOAlert.tsx          -- Dropped keyword alert card
KeywordPositionBadge.tsx  -- Position with trend indicator
ClusterPill.tsx      -- Keyword tag in cluster view
PositionHistoryChart.tsx  -- Line chart for position over time
KeywordClusterCard.tsx    -- Cluster display card
CompetitorKeywordTable.tsx  -- Competitor analysis table
```

---

### 3. Integration Points

- [ ] Auth store: Premium feature gating for dropped keywords + clusters
- [ ] Product selection: Link keywords to specific products
- [ ] Dashboard: Add SEO widgets to main dashboard
- [ ] Notifications: Alert when keywords drop (could integrate with Telegram bot later)

---

## E2E Test Specifications

### File: `tests/e2e/seo-module.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('SEO Module', () => {

  // ========== Keyword Tracking ==========

  test('should add keyword to tracking', async ({ page }) => {
    // 1. Navigate to SEO Keyword Tracking
    await page.goto('/seo/keywords/tracking');

    // 2. Click "Add Keyword" button
    await page.click('[data-testid="add-keyword-btn"]');

    // 3. Fill form: keyword + select article
    await page.fill('[data-testid="keyword-input"]', 'детские кроссовки');
    await page.selectOption('[data-testid="article-select"]', { label: 'Артикул 123456' });

    // 4. Submit form
    await page.click('[data-testid="submit-keyword-btn"]');

    // 5. Verify keyword appears in table
    await expect(page.locator('table [data-testid="keyword-row"]')).toContainText('детские кроссовки');
    await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
  });

  test('should display keyword position history chart', async ({ page }) => {
    // 1. Navigate to SEO Keyword Tracking
    await page.goto('/seo/keywords/tracking');

    // 2. Click on a keyword row
    await page.click('[data-testid="keyword-row"]:first-child');

    // 3. Verify position history chart is displayed
    await expect(page.locator('[data-testid="position-history-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="chart-position-line"]')).toBeVisible();
  });

  test('should filter keywords by article', async ({ page }) => {
    // 1. Navigate to SEO Keyword Tracking
    await page.goto('/seo/keywords/tracking');

    // 2. Select article filter
    await page.selectOption('[data-testid="article-filter"]', { label: 'Артикул 123456' });

    // 3. Verify only matching keywords shown
    const rows = await page.locator('[data-testid="keyword-row"]').all();
    for (const row of rows) {
      await expect(row).toContainText('123456');
    }
  });

  test('should remove keyword from tracking', async ({ page }) => {
    // 1. Navigate to SEO Keyword Tracking
    await page.goto('/seo/keywords/tracking');

    // 2. Hover on keyword row and click delete
    const row = page.locator('[data-testid="keyword-row"]').first();
    await row.hover();
    await row.locator('[data-testid="delete-keyword-btn"]').click();

    // 3. Confirm deletion in modal
    await page.click('[data-testid="confirm-delete-btn"]');

    // 4. Verify keyword removed and success toast shown
    await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
  });

  // ========== Dropped Keywords ==========

  test('should display dropped keywords list', async ({ page }) => {
    // 1. Navigate to Dropped Keywords page
    await page.goto('/seo/keywords/dropped');

    // 2. Verify page loads with dropped keywords section
    await expect(page.locator('[data-testid="dropped-keywords-header"]')).toBeVisible();

    // 3. Verify dropped keywords show: keyword, last seen date, previous position
    await expect(page.locator('[data-testid="dropped-keyword-card"]').first()).toBeVisible();
  });

  test('should run dropped keyword detection', async ({ page }) => {
    // 1. Navigate to Dropped Keywords page
    await page.goto('/seo/keywords/dropped');

    // 2. Click "Check Now" button
    await page.click('[data-testid="check-dropped-btn"]');

    // 3. Verify loading indicator during check
    await expect(page.locator('[data-testid="checking-loader"]')).toBeVisible();

    // 4. Wait for check to complete and verify results
    await expect(page.locator('[data-testid="dropped-keywords-list"]')).toBeVisible();
  });

  test('should show recovery suggestions for dropped keywords', async ({ page }) => {
    // 1. Navigate to Dropped Keywords page
    await page.goto('/seo/keywords/dropped');

    // 2. Click "Recover" on a dropped keyword card
    await page.locator('[data-testid="dropped-keyword-card"]').first().locator('[data-testid="recover-btn"]').click();

    // 3. Verify recovery suggestions modal opens with AI-generated suggestions
    await expect(page.locator('[data-testid="recovery-suggestions-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="suggested-keywords"]').first()).toBeVisible();
  });

  // ========== Keyword Clusters ==========

  test('should create keyword cluster with AI', async ({ page }) => {
    // 1. Navigate to Keyword Clusters page
    await page.goto('/seo/keywords/clusters');

    // 2. Click "Create Cluster" button
    await page.click('[data-testid="create-cluster-btn"]');

    // 3. Select keywords to cluster (checkboxes)
    await page.check('[data-testid="keyword-checkbox"]:nth-child(1)');
    await page.check('[data-testid="keyword-checkbox"]:nth-child(2)');
    await page.check('[data-testid="keyword-checkbox"]:nth-child(3)');

    // 4. Click "Cluster with AI"
    await page.click('[data-testid="cluster-ai-btn"]');

    // 5. Verify AI processing indicator
    await expect(page.locator('[data-testid="ai-processing"]')).toBeVisible();

    // 6. Verify cluster created with grouped keywords
    await expect(page.locator('[data-testid="cluster-card"]').last()).toBeVisible();
    await expect(page.locator('[data-testid="success-toast"]')).toContainText('Кластер создан');
  });

  test('should display cluster with keyword pills', async ({ page }) => {
    // 1. Navigate to Keyword Clusters page
    await page.goto('/seo/keywords/clusters');

    // 2. Click on a cluster card
    await page.locator('[data-testid="cluster-card"]').first().click();

    // 3. Verify cluster detail view with keyword pills
    await expect(page.locator('[data-testid="cluster-keyword-pill"]').first()).toBeVisible();
    await expect(page.locator('[data-testid="cluster-name"]')).toBeVisible();
  });

  test('should merge two clusters', async ({ page }) => {
    // 1. Navigate to Keyword Clusters page
    await page.goto('/seo/keywords/clusters');

    // 2. Select first cluster checkbox
    await page.check('[data-testid="cluster-checkbox"]:nth-child(1)');

    // 3. Select second cluster checkbox
    await page.check('[data-testid="cluster-checkbox"]:nth-child(2)');

    // 4. Click "Merge Selected"
    await page.click('[data-testid="merge-clusters-btn"]');

    // 5. Confirm merge in modal
    await page.click('[data-testid="confirm-merge-btn"]');

    // 6. Verify clusters merged and success toast shown
    await expect(page.locator('[data-testid="success-toast"]')).toContainText('Объединено');
  });

  // ========== Competitor Analysis ==========

  test('should collect keywords from competitor article', async ({ page }) => {
    // 1. Navigate to Competitor Analysis page
    await page.goto('/seo/competitors');

    // 2. Enter competitor article ID
    await page.fill('[data-testid="competitor-article-input"]', '987654321');

    // 3. Click "Collect Keywords"
    await page.click('[data-testid="collect-keywords-btn"]');

    // 4. Verify loading indicator during collection
    await expect(page.locator('[data-testid="collecting-loader"]')).toBeVisible();

    // 5. Wait for collection to complete
    await expect(page.locator('[data-testid="competitor-keywords-table"]')).toBeVisible();

    // 6. Verify keywords extracted
    const keywordCount = await page.locator('[data-testid="competitor-keyword-row"]').count();
    expect(keywordCount).toBeGreaterThan(0);
  });

  test('should compare competitor keywords with own keywords', async ({ page }) => {
    // 1. Navigate to Competitor Analysis page
    await page.goto('/seo/competitors');

    // 2. Enter competitor article ID and collect
    await page.fill('[data-testid="competitor-article-input"]', '987654321');
    await page.click('[data-testid="collect-keywords-btn"]');
    await expect(page.locator('[data-testid="competitor-keywords-table"]')).toBeVisible();

    // 3. Click "Find Gaps" button
    await page.click('[data-testid="find-gaps-btn"]');

    // 4. Verify gaps displayed — keywords competitor has that user doesn't
    await expect(page.locator('[data-testid="keyword-gaps-section"]')).toBeVisible();
    await expect(page.locator('[data-testid="gap-keyword-badge"]').first()).toBeVisible();
  });

  // ========== SEO Dashboard ==========

  test('should display SEO overview dashboard', async ({ page }) => {
    // 1. Navigate to SEO Dashboard
    await page.goto('/seo');

    // 2. Verify dashboard widgets displayed
    await expect(page.locator('[data-testid="seo-position-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="dropped-keywords-count"]')).toBeVisible();
    await expect(page.locator('[data-testid="top-keywords-table"]')).toBeVisible();
  });

  // ========== Premium Feature Gating ==========

  test('should block free users from dropped keywords detection', async ({ page }) => {
    // 1. Login as free user
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'free@user.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-btn"]');

    // 2. Navigate to Dropped Keywords
    await page.goto('/seo/keywords/dropped');

    // 3. Verify premium upgrade modal shown
    await expect(page.locator('[data-testid="premium-upgrade-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="upgrade-btn"]')).toBeVisible();
  });

  test('should block free users from keyword clustering', async ({ page }) => {
    // 1. Login as free user
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'free@user.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-btn"]');

    // 2. Navigate to Keyword Clusters
    await page.goto('/seo/keywords/clusters');

    // 3. Verify premium upgrade modal shown
    await expect(page.locator('[data-testid="premium-upgrade-modal"]')).toBeVisible();
  });
});
```

---

## Success Criteria

- [ ] User can add/remove keywords to tracking
- [ ] Keyword positions are tracked and displayed with history chart
- [ ] Dropped keywords are detected automatically
- [ ] Keywords can be clustered by semantic similarity using AI
- [ ] Competitor article keywords can be extracted
- [ ] Gap analysis shows keywords competitor has that user doesn't
- [ ] Free users see premium upgrade modal for advanced features
- [ ] All E2E tests pass
- [ ] Backend: unit tests for SEO domain logic
- [ ] Frontend: component tests for SEO components
