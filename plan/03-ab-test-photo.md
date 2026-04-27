# Feature: A/B Test Photo — Split-Testing for Product Images

## Overview

**A/B Test Photo** is Marpla's split-testing service for Wildberries product images:
- Test different product photos to improve CTR
- Statistical significance calculation
- Clear winner identification
- Works with any product images
- Shows CTR improvement data
- #1 service for A/B testing photos on Wildberries

---

## Implementation Prompt

### Context Loading

Before implementing, load the following context files:
```
@.opencode/context/core/standards/code-quality.md
@.opencode/context/core/standards/api-design.md
@.opencode/context/core/testing.md
```

Also load reference files:
- Backend: `backend/src/Domain/*.hs`
- Frontend: `frontend/src/pages/ReturnsForecastPage.tsx` (for chart patterns)

---

### 1. Backend Implementation

#### 1.1 Database Schema

Create new tables in `backend/src/Database/Schema.hs`:

```haskell
-- A/B Test experiments
ABTest
    testId Text PRIMARY KEY
    userId UserId
    articleId Text
    marketplace Marketplace
    name Text
    status TestStatus
    startDate Day Maybe
    endDate Day Maybe
    minSampleSize Int Default=1000
    confidenceLevel Double Default=0.95
    winnerId Text Maybe
    createdAt UTCTime
    updatedAt UTCTime
    deriving Eq Show

data TestStatus
    = TestDraft
    | TestRunning
    | TestCompleted
    | TestPaused
    deriving (Eq, Show)

-- Test variants (photos)
ABVariant
    variantId Text PRIMARY KEY
    testId Text
    variantName Text          -- "A", "B", "C", etc.
    imageUrl Text
    impressions Int Default=0
    clicks Int Default=0
    ctr Double Computed       -- clicks / impressions
    createdAt UTCTime
    deriving Eq Show

-- Daily statistics per variant
VariantDailyStats
    statsId Text PRIMARY KEY
    variantId Text
    date Day
    impressions Int
    clicks Int
    ctr Double
    derived Eq Show

-- Test results
ABTestResult
    resultId Text PRIMARY KEY
    testId Text
    winnerVariantId Text
    improvementPercent Double  -- How much better winner is vs control
    confidence Double           -- Statistical confidence level
    avgCtrWinner Double
    avgCtrControl Double
    totalImpressions Int
    totalClicks Int
    completedAt UTCTime
    deriving Eq Show
```

#### 1.2 New API Endpoints

Add to `backend/src/Api/Routes.hs`:

```haskell
-- A/B Test Management
GET    /ab-tests                    -- List all tests
POST   /ab-tests                    -- Create new test
GET    /ab-tests/:id                -- Get test details
PUT    /ab-tests/:id                -- Update test
DELETE /ab-tests/:id                -- Delete test
POST   /ab-tests/:id/start           -- Start test
POST   /ab-tests/:id/pause           -- Pause test
POST   /ab-tests/:id/stop            -- Stop test and calculate winner

-- Variants
GET    /ab-tests/:id/variants       -- List variants in test
POST   /ab-tests/:id/variants       -- Add variant (photo)
PUT    /ab-tests/:id/variants/:vid  -- Update variant
DELETE /ab-tests/:id/variants/:vid  -- Remove variant

-- Statistics
GET    /ab-tests/:id/stats           -- Get test statistics
GET    /ab-tests/:id/stats/daily    -- Get daily breakdown
GET    /ab-tests/:id/variants/:vid/stats  -- Per-variant stats

-- Results
GET    /ab-tests/:id/results         -- Get test results with winner
```

#### 1.3 Statistical Analysis Module

Create `backend/src/Domain/ABTesting.hs`:

```haskell
module Domain.ABTesting where

-- Test configuration
data ABTestConfig = ABTestConfig
    { minSampleSize    :: Int
    , confidenceLevel :: Double     -- typically 0.95
    , maxDurationDays :: Int Maybe   -- optional time limit
    } deriving (Eq, Show)

-- Statistical test result
data StatisticalResult = StatisticalResult
    { isSignificant    :: Bool
    , confidence       :: Double
    , pValue           :: Double
    , effectSize       :: Double     -- difference between variants
    , winnerId         :: Text Maybe
    } deriving (Eq, Show)

-- Variant performance
data VariantPerformance = VariantPerformance
    { variantId       :: Text
    , impressions     :: Int
    , clicks          :: Int
    , ctr             :: Double
    , ctrVariance     :: Double
    , avgPosition     :: Double
    } deriving (Eq, Show)

-- Calculate CTR and variance
calculateCTR :: Int -> Int -> Double
calculateCTR clicks impressions
    | impressions == 0 = 0
    | otherwise = fromIntegral clicks / fromIntegral impressions

-- Chi-squared test for statistical significance
chiSquaredTest
    :: [(Text, Int, Int)]  -- [(variantId, clicks, impressions)]
    -> Double              -- p-value
    -> StatisticalResult

-- Determine if test has a winner
determineWinner
    :: [VariantPerformance]
    -> ABTestConfig
    -> Maybe Text

-- Calculate required sample size for given effect
calculateRequiredSampleSize
    :: Double   -- baseline CTR
    -> Double   -- minimum detectable effect (e.g., 0.05 for 5% improvement)
    -> Double   -- desired confidence
    -> Int      -- required sample size per variant

-- Calculate improvement percentage
calculateImprovement :: Double -> Double -> Double
```

#### 1.4 WB Integration for A/B Data

Create `backend/src/Integration/WB/ABTest.hs`:

```haskell
module Integration.WB.ABTest where

class WBABTestClient m where
    -- Get impressions/clicks for a variant (by article + image hash)
    getVariantStats
        :: Text              -- article ID
        -> Text              -- image identifier
        -> Day               -- date
        -> m VariantStats

    -- Report variant click (when user clicks product from search)
    reportClick
        :: Text              -- article ID
        -> Text              -- image identifier
        -> m ()

-- Note: WB doesn't have official A/B test API
-- This would use WB statistics API + cookie-based tracking
-- Or track via affiliate links / UTM parameters
```

---

### 2. Frontend Implementation

#### 2.1 Pages/Routes

Add to `frontend/src/router.tsx`:

```typescript
const ABTestList = lazy(() => import('@/pages/abtest/ABTestListPage'));
const ABTestDetail = lazy(() => import('@/pages/abtest/ABTestDetailPage'));
const ABTestCreate = lazy(() => import('@/pages/abtest/ABTestCreatePage'));
const ABTestResults = lazy(() => import('@/pages/abtest/ABTestResultsPage'));

// Routes
{ path: '/ab-tests', element: <ABTestList /> },
{ path: '/ab-tests/new', element: <ABTestCreate /> },
{ path: '/ab-tests/:id', element: <ABTestDetail /> },
{ path: '/ab-tests/:id/results', element: <ABTestResults /> },
```

#### 2.2 Page Components

**ABTestListPage.tsx** — Test management:
- Table: Name, Article, Status, Variants, Winner, Days Running
- Status badges: Draft, Running, Completed, Paused
- Actions: View, Pause/Resume, Delete
- Create new test button

**ABTestCreatePage.tsx** — Create test wizard:
- Step 1: Select article (search/browse products)
- Step 2: Upload images (drag & drop, max 4 variants)
- Step 3: Set test parameters (min sample, confidence)
- Step 4: Review and create

**ABTestDetailPage.tsx** — Test monitoring:
- Test header with status and key metrics
- Real-time variant comparison cards:
  - Image preview
  - Impressions, Clicks, CTR
  - CTR vs baseline indicator
- Live chart: CTR over time
- Statistical significance indicator
- Winner announcement when confident

**ABTestResultsPage.tsx** — Test results:
- Winner highlight card with image
- Improvement metrics: CTR lift, confidence
- Full variant comparison table
- Recommendations for applying winner

#### 2.3 Hooks

```typescript
// hooks/useABTests.ts
useABTests()
  -> { tests: ABTest[], isLoading, createTest, deleteTest }

// hooks/useABTestDetail.ts
useABTestDetail(testId: string)
  -> { test: ABTest, variants: ABVariant[], stats: TestStats, isLoading }

// hooks/useABTestStats.ts
useABTestStats(testId: string)
  -> { dailyStats: DailyStats[], isLoading }
```

#### 2.4 UI Components

Create in `frontend/src/components/abtest/`:

```
VariantCard.tsx             -- Variant comparison card
VariantImageUpload.tsx      -- Drag & drop image upload
CTRChart.tsx                -- Live CTR comparison chart
StatisticalSignificance.tsx -- Confidence meter
WinnerBadge.tsx             -- Winner indicator
ABTestProgress.tsx          -- Sample size progress bar
VariantStatsTable.tsx       -- Detailed stats per variant
```

---

### 3. Integration Points

- [ ] Product selection: Link tests to specific products
- [ ] Dashboard: Show best performing images per product
- [ ] Notifications: Alert when winner is determined

---

## E2E Test Specifications

### File: `tests/e2e/abtest-photo.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('A/B Test Photo', () => {

  // ========== Test Creation ==========

  test('should create new A/B test', async ({ page }) => {
    // 1. Navigate to create test page
    await page.goto('/ab-tests/new');

    // 2. Select article
    await page.fill('[data-testid="article-search"]', '123456');
    await page.selectOption('[data-testid="article-select"]', { label: 'Артикул 123456' });

    // 3. Upload variant A image
    const uploadA = page.locator('[data-testid="variant-upload-a"]');
    await uploadA.setInputFiles('tests/fixtures/photo-a.jpg');

    // 4. Upload variant B image
    const uploadB = page.locator('[data-testid="variant-upload-b"]');
    await uploadB.setInputFiles('tests/fixtures/photo-b.jpg');

    // 5. Set test parameters
    await page.fill('[data-testid="min-sample-input"]', '500');
    await page.fill('[data-testid="confidence-input"]', '95');

    // 6. Create test
    await page.click('[data-testid="create-test-btn"]');

    // 7. Verify redirect to test detail
    await expect(page).toHaveURL(/\/ab-tests\/[a-z0-9]+/);
    await expect(page.locator('[data-testid="test-status"]')).toContainText('Черновик');
  });

  test('should validate minimum 2 variants required', async ({ page }) => {
    // 1. Navigate to create test page
    await page.goto('/ab-tests/new');

    // 2. Upload only one image
    const uploadA = page.locator('[data-testid="variant-upload-a"]');
    await uploadA.setInputFiles('tests/fixtures/photo-a.jpg');

    // 3. Try to create test
    await page.click('[data-testid="create-test-btn"]');

    // 4. Verify error message
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Минимум 2 варианта');
  });

  // ========== Test Management ==========

  test('should start A/B test', async ({ page }) => {
    // 1. Navigate to test detail
    await page.goto('/ab-tests/test_123');

    // 2. Click Start button
    await page.click('[data-testid="start-test-btn"]');

    // 3. Verify status changes to Running
    await expect(page.locator('[data-testid="test-status"]')).toContainText('Запущен');
    await expect(page.locator('[data-testid="started-at"]')).toBeVisible();
  });

  test('should pause running test', async ({ page }) => {
    // 1. Navigate to test detail
    await page.goto('/ab-tests/test_123');

    // 2. Click Pause button
    await page.click('[data-testid="pause-test-btn"]');

    // 3. Verify status changes to Paused
    await expect(page.locator('[data-testid="test-status"]')).toContainText('Приостановлен');
  });

  test('should stop test and determine winner', async ({ page }) => {
    // 1. Navigate to test detail
    await page.goto('/ab-tests/test_123');

    // 2. Click Stop button
    await page.click('[data-testid="stop-test-btn"]');

    // 3. Confirm in modal
    await page.click('[data-testid="confirm-stop-btn"]');

    // 4. Verify winner is determined and displayed
    await expect(page.locator('[data-testid="test-status"]')).toContainText('Завершен');
    await expect(page.locator('[data-testid="winner-badge"]')).toBeVisible();
  });

  test('should delete draft test', async ({ page }) => {
    // 1. Navigate to tests list
    await page.goto('/ab-tests');

    // 2. Click delete on draft test
    await page.locator('[data-testid="test-row"]').filter({ has: page.locator('[data-testid="status"]:has-text("Черновик")') }).locator('[data-testid="delete-btn"]').click();

    // 3. Confirm deletion
    await page.click('[data-testid="confirm-delete-btn"]');

    // 4. Verify test removed
    await expect(page.locator('[data-testid="success-toast"]')).toContainText('Удалено');
  });

  // ========== Variant Display ==========

  test('should display variant cards with stats', async ({ page }) => {
    // 1. Navigate to running test
    await page.goto('/ab-tests/test_123');

    // 2. Verify variant cards displayed
    await expect(page.locator('[data-testid="variant-card"]').first()).toBeVisible();
    await expect(page.locator('[data-testid="variant-image"]').first()).toBeVisible();

    // 3. Verify stats shown for each variant
    const firstCard = page.locator('[data-testid="variant-card"]').first();
    await expect(firstCard.locator('[data-testid="impressions-count"]')).toBeVisible();
    await expect(firstCard.locator('[data-testid="clicks-count"]')).toBeVisible();
    await expect(firstCard.locator('[data-testid="ctr-value"]')).toBeVisible();
  });

  test('should show CTR comparison chart', async ({ page }) => {
    // 1. Navigate to running test
    await page.goto('/ab-tests/test_123');

    // 2. Verify CTR chart displayed
    await expect(page.locator('[data-testid="ctr-comparison-chart"]')).toBeVisible();

    // 3. Verify both variants shown in chart
    await expect(page.locator('[data-testid="chart-line-variant-a"]')).toBeVisible();
    await expect(page.locator('[data-testid="chart-line-variant-b"]')).toBeVisible();
  });

  // ========== Statistical Significance ==========

  test('should display statistical significance meter', async ({ page }) => {
    // 1. Navigate to running test
    await page.goto('/ab-tests/test_123');

    // 2. Verify significance meter displayed
    await expect(page.locator('[data-testid="significance-meter"]')).toBeVisible();
    await expect(page.locator('[data-testid="confidence-percent"]')).toBeVisible();
  });

  test('should show winner badge when significance reached', async ({ page }) => {
    // 1. Navigate to test with high confidence
    await page.goto('/ab-tests/test_456');

    // 2. Wait for confidence to reach threshold
    await page.waitForSelector('[data-testid="winner-badge"]', { timeout: 60000 });

    // 3. Verify winner badge visible with variant name
    await expect(page.locator('[data-testid="winner-badge"]')).toContainText('Победитель');
    await expect(page.locator('[data-testid="winner-name"]')).toBeVisible();
  });

  // ========== Results Page ==========

  test('should display test results with improvement metrics', async ({ page }) => {
    // 1. Navigate to test results
    await page.goto('/ab-tests/test_123/results');

    // 2. Verify winner section
    await expect(page.locator('[data-testid="winner-section"]')).toBeVisible();
    await expect(page.locator('[data-testid="winner-image"]')).toBeVisible();

    // 3. Verify improvement metrics
    await expect(page.locator('[data-testid="improvement-percent"]')).toBeVisible();
    await expect(page.locator('[data-testid="confidence-level"]')).toBeVisible();

    // 4. Verify variant comparison table
    await expect(page.locator('[data-testid="results-table"]')).toBeVisible();
  });

  test('should show CTR lift visualization', async ({ page }) => {
    // 1. Navigate to test results
    await page.goto('/ab-tests/test_123/results');

    // 2. Verify CTR comparison visualization
    await expect(page.locator('[data-testid="ctr-lift-chart"]')).toBeVisible();

    // 3. Verify improvement percentage highlighted
    await expect(page.locator('[data-testid="ctr-lift-value"]')).toContainText('%');
  });

  // ========== Tests List ==========

  test('should display all tests with status', async ({ page }) => {
    // 1. Navigate to tests list
    await page.goto('/ab-tests');

    // 2. Verify table with all tests
    await expect(page.locator('[data-testid="tests-table"]')).toBeVisible();
    await expect(page.locator('[data-testid="test-row"]').first()).toBeVisible();

    // 3. Verify status badges displayed
    await expect(page.locator('[data-testid="test-status"]').first()).toBeVisible();
  });

  test('should filter tests by status', async ({ page }) => {
    // 1. Navigate to tests list
    await page.goto('/ab-tests');

    // 2. Filter by Running
    await page.selectOption('[data-testid="status-filter"]', { label: 'Запущенные' });

    // 3. Verify only running tests shown
    const rows = await page.locator('[data-testid="test-row"]').all();
    for (const row of rows) {
      await expect(row.locator('[data-testid="status"]')).toContainText('Запущен');
    }
  });

  // ========== Premium Feature Gating ==========

  test('should block free users from creating tests', async ({ page }) => {
    // 1. Login as free user
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'free@user.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-btn"]');

    // 2. Navigate to create test
    await page.goto('/ab-tests/new');

    // 3. Verify premium upgrade modal
    await expect(page.locator('[data-testid="premium-upgrade-modal"]')).toBeVisible();
  });
});
```

---

## Success Criteria

- [ ] User can create A/B test with 2+ image variants
- [ ] User can start, pause, stop tests
- [ ] CTR is tracked for each variant
- [ ] Statistical significance is calculated
- [ ] Winner is determined when confidence threshold met
- [ ] Results page shows improvement metrics
- [ ] Free users see premium upgrade modal
- [ ] All E2E tests pass
- [ ] Backend: unit tests for statistical calculations
- [ ] Frontend: component tests for A/B test components
