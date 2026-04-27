# Feature: M.Биддер — Automatic Bid Management System

## Overview

**M.Биддер** is Marpla's automatic bid management system for Wildberries advertising:
- Automatic bid adjustment to maintain target positions
- Supports multiple ad types: search ads, auto-ads, in-card ads
- Position holding — keep ad at specific position range
- 100% safe operation via official WB API (no API key required for basic operation)
- Cost optimization — reduce spend while maintaining visibility
- 10,000+ active sellers using the service

---

## Implementation Prompt

### Context Loading

Before implementing, load the following context files:
```
@.opencode/context/core/standards/code-quality.md
@.opencode/context/core/standards/api-design.md
@.opencode/context/core/standards/testing.md
```

Also load reference files:
- Backend: `backend/src/Auth/*.hs`, `backend/src/Integration/Marketplace.hs`
- Frontend: `frontend/src/stores/authStore.ts`, `frontend/src/pages/SettingsPage.tsx`

---

### 1. Backend Implementation

#### 1.1 Database Schema

Create new tables in `backend/src/Database/Schema.hs`:

```haskell
-- Advertising campaigns
AdCampaign
    campaignId Text PRIMARY KEY
    userId UserId
    marketplace Marketplace
    campaignType CampaignType  -- Search, Auto, InCard
    status CampaignStatus      -- Active, Paused, Stopped
    targetPosition Int Maybe   -- Target position to maintain
    maxBid Double Maybe         -- Maximum bid limit
    dailyBudget Double Maybe   -- Daily budget limit
    createdAt UTCTime
    updatedAt UTCTime
    deriving Eq Show

-- Campaign ad groups (for grouping keywords)
AdGroup
    groupId Text PRIMARY KEY
    campaignId Text
    name Text
    status GroupStatus
    deriving Eq Show

-- Campaign keywords/ASINs
AdKeyword
    keywordId Text PRIMARY KEY
    groupId Text
    keyword Text Maybe        -- for search ads
    articleId Text Maybe      -- for auto/in-card ads
    currentBid Double
    targetBid Double Maybe
    status KeywordStatus
    derived Eq Show

-- Bid history for analytics
BidHistory
    bidId Text PRIMARY KEY
    keywordId Text
    bidAmount Double
    position Int Maybe
    impressions Int
    clicks Int
    spend Double
    recordedAt UTCTime
    deriving Eq Show

-- Position tracking
PositionSnapshot
    snapshotId Text PRIMARY KEY
    keywordId Text
    position Int
    timestamp UTCTime
    deriving Eq Show

-- Campaign performance metrics
CampaignMetrics
    metricsId Text PRIMARY KEY
    campaignId Text
    date Day
    totalSpend Double
    totalImpressions Int
    totalClicks Int
    avgPosition Double
    conversions Int
    deriving Eq Show
```

#### 1.2 Campaign Types

```haskell
data CampaignType
    = SearchAd           -- Поисковая реклама
    | AutoAd             -- Автореклама
    | InCardAd           -- Реклама в карточке
    deriving (Eq, Show, Enum)

data CampaignStatus
    = CampaignActive
    | CampaignPaused
    | CampaignStopped
    deriving (Eq, Show)

data KeywordStatus
    = KeywordActive
    | KeywordPaused
    | KeywordExhausted  -- Daily budget spent
    deriving (Eq, Show)
```

#### 1.3 New API Endpoints

Add to `backend/src/Api/Routes.hs`:

```haskell
-- Campaign Management
GET    /ads/campaigns                    -- List all campaigns
POST   /ads/campaigns                    -- Create campaign
GET    /ads/campaigns/:id                -- Get campaign details
PUT    /ads/campaigns/:id                -- Update campaign
DELETE /ads/campaigns/:id                -- Delete campaign
POST   /ads/campaigns/:id/pause          -- Pause campaign
POST   /ads/campaigns/:id/resume         -- Resume campaign

-- Ad Groups
GET    /ads/campaigns/:id/groups         -- List groups in campaign
POST   /ads/campaigns/:id/groups         -- Create group
PUT    /ads/groups/:id                   -- Update group
DELETE /ads/groups/:id                   -- Delete group

-- Keywords/ASINs
GET    /ads/groups/:id/keywords          -- List keywords in group
POST   /ads/groups/:id/keywords          -- Add keyword/ASIN
PUT    /ads/keywords/:id                 -- Update keyword bid
DELETE /ads/keywords/:id                 -- Remove keyword

-- Bid Management
POST   /ads/keywords/:id/bid            -- Set bid amount
POST   /ads/keywords/:id/auto-bid        -- Enable auto-bidding
POST   /ads/keywords/:id/target-position -- Set target position

-- Performance & Analytics
GET    /ads/campaigns/:id/metrics        -- Get campaign metrics
GET    /ads/campaigns/:id/bid-history    -- Get bid history
GET    /ads/campaigns/:id/positions      -- Get position snapshots

-- WB Integration
POST   /ads/wb/connect                   -- Connect WB account
GET    /ads/wb/campaigns                 -- Sync WB campaigns
POST   /ads/wb/sync                      -- Sync all data
```

#### 1.4 WB API Integration

Create `backend/src/Integration/WB/Advertising.hs`:

```haskell
module Integration.WB.Advertising where

class WBAdvertisingClient m where
    -- Campaign operations
    listCampaigns :: m [WBCampaign]
    createCampaign :: WBCampaignCreate -> m WBCampaign
    updateCampaign :: Text -> WBCampaignUpdate -> m ()
    deleteCampaign :: Text -> m ()

    -- Keyword operations
    listKeywords :: Text -> m [WBKeyword]  -- by campaign ID
    setKeywordBid :: Text -> Double -> m ()
    setKeywordStatus :: Text -> KeywordStatus -> m ()

    -- Bidding
    getOptimalBid :: Text -> Int -> m Double  -- keyword, target position
    autoBid :: Text -> m BidResult             -- auto-adjust bid

    -- Analytics
    getCampaignStats :: Text -> Day -> Day -> m CampaignStats
    getKeywordStats :: Text -> Day -> Day -> m KeywordStats

-- WB API response types
data WBCampaign = WBCampaign
    { wbCampaignId   :: Text
    , wbCampaignName :: Text
    , wbCampaignType :: CampaignType
    , wbStatus       :: CampaignStatus
    , wbBudget       :: Double
    , wbSpend        :: Double
    } deriving (Eq, Show)

data WBKeyword = WBKeyword
    { wbKeywordId :: Text
    , wbPhrase    :: Text
    , wbBid       :: Double
    , wbPosition  :: Int Maybe
    , wbStatus    :: KeywordStatus
    } deriving (Eq, Show)

data CampaignStats = CampaignStats
    { csImpressions :: Int
    , csClicks      :: Int
    , csSpend       :: Double
    , csCtr         :: Double
    , csAvgPosition :: Double
    , csConversions :: Int
    } deriving (Eq, Show)
```

#### 1.5 Auto-Bidding Logic

Create `backend/src/Domain/Bidding.hs`:

```haskell
module Domain.Bidding where

-- Auto-bidding strategy
data BidStrategy
    = MaintainPosition Int      -- Keep at position N
    | MaximizeClicks Budget      -- Maximize clicks within budget
    | MaximizeConversions Budget
    | MinimizeCost Position
    deriving (Eq, Show)

-- Bid adjustment result
data BidAdjustment = BidAdjustment
    { baKeywordId       :: Text
    , baPreviousBid     :: Double
    , baNewBid          :: Double
    , baTargetPosition  :: Int Maybe
    , baExpectedPosition :: Int Maybe
    , baChangeReason    :: Text
    } deriving (Eq, Show)

-- Position analysis
data PositionAnalysis = PositionAnalysis
    { paCurrentPosition :: Int
    , paTargetPosition  :: Int
    , paBidAdjustment   :: BidAdjustment
    , paConfidence      :: Double  -- How confident we are in the adjustment
    } deriving (Eq, Show)

-- Calculate optimal bid based on strategy
calculateOptimalBid
    :: BidStrategy
    -> PositionHistory      -- Historical position data
    -> Double               -- Current bid
    -> BidAdjustment

-- Analyze position vs target
analyzePosition
    :: Int         -- current position
    -> Int         -- target position
    -> Double      -- current bid
    -> PositionAnalysis

-- Safety checks before bid change
validateBidChange :: Double -> Double -> BidAdjustment -> Either BidError BidAdjustment

data BidError
    = BidTooLow Double
    | BidTooHigh Double
    | DailyBudgetExceeded
    | PositionUnreachable
    deriving (Eq, Show)
```

#### 1.6 Bid Adjustment Engine

Create `backend/src/Service/BidEngine.hs`:

```haskell
module Service.BidEngine where

-- Main bid adjustment loop (called periodically)
runBidAdjustmentCycle :: (WBAdvertisingClient m, Logger m) => m [BidAdjustment]

-- Process single keyword
processKeyword
    :: (WBAdvertisingClient m)
    => AdKeyword
    -> CampaignMetrics
    -> m (Maybe BidAdjustment)

-- Move toward target position
adjustForPosition
    :: Int       -- current position
    -> Int       -- target position
    -> Double    -- current bid
    -> Double    -- suggested new bid

-- Respond to spending pace
adjustForBudget
    :: Double    -- daily budget
    -> Double    -- spent so far today
    -> Double    -- current bid
    -> Double    -- suggested new bid
```

---

### 2. Frontend Implementation

#### 2.1 Pages/Routes

Add to `frontend/src/router.tsx`:

```typescript
const AdsDashboard = lazy(() => import('@/pages/ads/AdsDashboardPage'));
const CampaignList = lazy(() => import('@/pages/ads/CampaignListPage'));
const CampaignDetail = lazy(() => import('@/pages/ads/CampaignDetailPage'));
const CampaignCreate = lazy(() => import('@/pages/ads/CampaignCreatePage'));
const BidManagement = lazy(() => import('@/pages/ads/BidManagementPage'));
const AdsAnalytics = lazy(() => import('@/pages/ads/AdsAnalyticsPage'));

// Routes
{ path: '/ads', element: <AdsDashboard /> },
{ path: '/ads/campaigns', element: <CampaignList /> },
{ path: '/ads/campaigns/new', element: <CampaignCreate /> },
{ path: '/ads/campaigns/:id', element: <CampaignDetail /> },
{ path: '/ads/bids', element: <BidManagement /> },
{ path: '/ads/analytics', element: <AdsAnalytics /> },
```

#### 2.2 Page Components

**AdsDashboardPage.tsx** — Overview:
- Total spend today/week/month cards
- Active campaigns count
- Average position chart
- Top performing campaigns table
- Quick actions: Create campaign, Pause all

**CampaignListPage.tsx** — Campaign management:
- Table: Name, Type, Status, Spend, Clicks, CTR, Avg Position
- Filters: by type, by status, by date range
- Actions: Pause, Resume, Edit, Delete
- Create campaign button

**CampaignDetailPage.tsx** — Single campaign:
- Campaign header with stats
- Tab navigation: Keywords, Groups, Analytics, Settings
- Keywords table with bid/position/performance
- Bid adjustment controls
- Position history chart

**CampaignCreatePage.tsx** — Create campaign wizard:
- Step 1: Campaign type selection (Search/Auto/InCard)
- Step 2: Basic info (name, budget, target position)
- Step 3: Add keywords or ASINs
- Step 4: Set initial bids
- Step 5: Review and create

**BidManagementPage.tsx** — Bulk bid management:
- Table: Keyword, Campaign, Current Bid, Target Position, Suggested Bid, Action
- Bulk actions: Apply all suggestions, Set same bid
- Auto-bid toggle per keyword
- Filter by campaign, by performance

**AdsAnalyticsPage.tsx** — Deep analytics:
- Date range selector
- Spend chart (line)
- CTR chart (line)
- Position distribution chart
- Conversions chart
- Campaign comparison table

#### 2.3 Hooks

```typescript
// hooks/useAdCampaigns.ts
useAdCampaigns(filters?: CampaignFilters)
  -> { campaigns: AdCampaign[], isLoading, createCampaign, updateCampaign }

// hooks/useCampaignKeywords.ts
useCampaignKeywords(campaignId: string)
  -> { keywords: AdKeyword[], isLoading, addKeyword, updateBid, removeKeyword }

// hooks/useBidAdjustments.ts
useBidAdjustments(campaignId: string)
  -> { adjustments: BidAdjustment[], isLoading, applyAdjustment, applyAll }

// hooks/useAdsAnalytics.ts
useAdsAnalytics(campaignId: string, dateRange: DateRange)
  -> { metrics: CampaignMetrics[], isLoading }
```

#### 2.4 UI Components

Create in `frontend/src/components/ads/`:

```
CampaignCard.tsx          -- Campaign summary card
CampaignStatusBadge.tsx    -- Active/Paused/Stopped badge
KeywordBidInput.tsx        -- Bid input with increment/decrement
PositionBadge.tsx          -- Position with trend indicator
SpendChart.tsx             -- Spend over time chart
BidSuggestionCard.tsx      -- Suggested bid change card
AutoBidToggle.tsx          -- Toggle auto-bidding on/off
CampaignTypeSelector.tsx   -- Campaign type cards
AdGroupTree.tsx            -- Campaign > Group > Keyword tree view
```

---

### 3. Integration Points

- [ ] Auth store: Premium feature gating for bid management
- [ ] WB Integration: Connect WB account for campaign sync
- [ ] Notifications: Alert when campaign budget nearly exhausted
- [ ] Settings: Configure auto-bid frequency, safety limits

---

## E2E Test Specifications

### File: `tests/e2e/bidder.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('M.Биддер — Bid Management', () => {

  // ========== Campaign Management ==========

  test('should create new search ad campaign', async ({ page }) => {
    // 1. Navigate to campaign creation
    await page.goto('/ads/campaigns/new');

    // 2. Select campaign type
    await page.click('[data-testid="campaign-type-search"]');

    // 3. Fill campaign details
    await page.fill('[data-testid="campaign-name-input"]', 'Test Campaign');
    await page.fill('[data-testid="daily-budget-input"]', '1000');

    // 4. Add keywords
    await page.fill('[data-testid="keyword-input"]', 'детские кроссовки');
    await page.click('[data-testid="add-keyword-btn"]');
    await page.fill('[data-testid="keyword-input"]', 'кроссовки мужские');
    await page.click('[data-testid="add-keyword-btn"]');

    // 5. Set initial bids
    await page.fill('[data-testid="bid-input"]:nth-child(1)', '5');

    // 6. Submit
    await page.click('[data-testid="create-campaign-btn"]');

    // 7. Verify redirect to campaign detail
    await expect(page).toHaveURL(/\/ads\/campaigns\/[a-z0-9]+/);
    await expect(page.locator('[data-testid="campaign-name"]')).toContainText('Test Campaign');
  });

  test('should pause campaign', async ({ page }) => {
    // 1. Navigate to campaigns list
    await page.goto('/ads/campaigns');

    // 2. Click pause button on active campaign
    await page.locator('[data-testid="campaign-row"]').first().locator('[data-testid="pause-btn"]').click();

    // 3. Verify status changes to Paused
    await expect(page.locator('[data-testid="campaign-status"]').first()).toContainText('Приостановлен');
    await expect(page.locator('[data-testid="success-toast"]')).toContainText('Приостановлено');
  });

  test('should resume paused campaign', async ({ page }) => {
    // 1. Navigate to campaigns list
    await page.goto('/ads/campaigns');

    // 2. Click resume button on paused campaign
    const pausedRow = page.locator('[data-testid="campaign-row"]').filter({ has: page.locator('[data-testid="campaign-status"]:has-text("Приостановлен")') });
    await pausedRow.locator('[data-testid="resume-btn"]').click();

    // 3. Verify status changes to Active
    await expect(page.locator('[data-testid="campaign-status"]').first()).toContainText('Активен');
  });

  test('should delete campaign', async ({ page }) => {
    // 1. Navigate to campaigns list
    await page.goto('/ads/campaigns');

    // 2. Click delete on campaign
    await page.locator('[data-testid="campaign-row"]').first().locator('[data-testid="delete-btn"]').click();

    // 3. Confirm deletion
    await page.click('[data-testid="confirm-delete-btn"]');

    // 4. Verify success and campaign removed
    await expect(page.locator('[data-testid="success-toast"]')).toContainText('Удалено');
  });

  // ========== Keyword Bid Management ==========

  test('should set bid for keyword', async ({ page }) => {
    // 1. Navigate to campaign detail
    await page.goto('/ads/campaigns/camp_123');

    // 2. Click on keywords tab
    await page.click('[data-testid="keywords-tab"]');

    // 3. Set bid for keyword
    const keywordRow = page.locator('[data-testid="keyword-row"]').first();
    await keywordRow.locator('[data-testid="bid-input"]').fill('7.50');
    await keywordRow.locator('[data-testid="save-bid-btn"]').click();

    // 4. Verify bid updated
    await expect(keywordRow.locator('[data-testid="current-bid"]')).toContainText('7.50');
    await expect(page.locator('[data-testid="success-toast"]')).toContainText('Ставка обновлена');
  });

  test('should enable auto-bidding for keyword', async ({ page }) => {
    // 1. Navigate to campaign detail
    await page.goto('/ads/campaigns/camp_123');

    // 2. Click on keywords tab
    await page.click('[data-testid="keywords-tab"]');

    // 3. Toggle auto-bid on
    const keywordRow = page.locator('[data-testid="keyword-row"]').first();
    await keywordRow.locator('[data-testid="auto-bid-toggle"]').click();

    // 4. Set target position
    await keywordRow.locator('[data-testid="target-position-input"]').fill('5');

    // 5. Verify auto-bid badge appears
    await expect(keywordRow.locator('[data-testid="auto-bid-badge"]')).toBeVisible();
  });

  test('should set target position for keyword', async ({ page }) => {
    // 1. Navigate to campaign detail
    await page.goto('/ads/campaigns/camp_123');

    // 2. Click on keywords tab
    await page.click('[data-testid="keywords-tab"]');

    // 3. Click set target position
    const keywordRow = page.locator('[data-testid="keyword-row"]').first();
    await keywordRow.locator('[data-testid="set-position-btn"]').click();

    // 4. Enter target position in modal
    await page.fill('[data-testid="target-position-input"]', '3');
    await page.click('[data-testid="confirm-position-btn"]');

    // 5. Verify target position set
    await expect(keywordRow.locator('[data-testid="target-position"]')).toContainText('3');
  });

  // ========== Bid Management Page ==========

  test('should display bid suggestions', async ({ page }) => {
    // 1. Navigate to bid management
    await page.goto('/ads/bids');

    // 2. Verify keywords table with suggestions is displayed
    await expect(page.locator('[data-testid="bids-table"]')).toBeVisible();
    await expect(page.locator('[data-testid="suggested-bid-column"]').first()).toBeVisible();
  });

  test('should apply single bid suggestion', async ({ page }) => {
    // 1. Navigate to bid management
    await page.goto('/ads/bids');

    // 2. Click apply on first suggestion
    const firstRow = page.locator('[data-testid="bid-suggestion-row"]').first();
    await firstRow.locator('[data-testid="apply-suggestion-btn"]').click();

    // 3. Verify bid updated
    await expect(firstRow.locator('[data-testid="current-bid"]')).toContainText('7.00');
  });

  test('should apply all bid suggestions', async ({ page }) => {
    // 1. Navigate to bid management
    await page.goto('/ads/bids');

    // 2. Click "Apply All"
    await page.click('[data-testid="apply-all-btn"]');

    // 3. Confirm in modal
    await page.click('[data-testid="confirm-apply-all-btn"]');

    // 4. Verify all bids updated
    await expect(page.locator('[data-testid="success-toast"]')).toContainText('Все ставки обновлены');
  });

  // ========== Analytics ==========

  test('should display campaign analytics', async ({ page }) => {
    // 1. Navigate to analytics
    await page.goto('/ads/analytics');

    // 2. Select date range
    await page.selectOption('[data-testid="date-range-select"]', { label: 'Последние 7 дней' });

    // 3. Verify charts displayed
    await expect(page.locator('[data-testid="spend-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="ctr-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="position-chart"]')).toBeVisible();
  });

  test('should compare campaign performance', async ({ page }) => {
    // 1. Navigate to analytics
    await page.goto('/ads/analytics');

    // 2. Select multiple campaigns to compare
    await page.check('[data-testid="campaign-checkbox"]:nth-child(1)');
    await page.check('[data-testid="campaign-checkbox"]:nth-child(2)');

    // 3. Click Compare
    await page.click('[data-testid="compare-btn"]');

    // 4. Verify comparison table displayed
    await expect(page.locator('[data-testid="comparison-table"]')).toBeVisible();
  });

  // ========== WB Account Connection ==========

  test('should connect WB account', async ({ page }) => {
    // 1. Navigate to settings
    await page.goto('/ads/settings');

    // 2. Click "Connect WB Account"
    await page.click('[data-testid="connect-wb-btn"]');

    // 3. Enter WB credentials
    await page.fill('[data-testid="wb-supplier-id"]', '12345678');
    await page.fill('[data-testid="wb-api-key"]', 'test-api-key');

    // 4. Submit
    await page.click('[data-testid="submit-wb-credentials"]');

    // 5. Verify connection success
    await expect(page.locator('[data-testid="wb-connected-badge"]')).toBeVisible();
    await expect(page.locator('[data-testid="success-toast"]')).toContainText('Подключено');
  });

  test('should sync campaigns from WB', async ({ page }) => {
    // 1. Navigate to settings
    await page.goto('/ads/settings');

    // 2. Click "Sync Campaigns"
    await page.click('[data-testid="sync-wb-btn"]');

    // 3. Verify sync progress indicator
    await expect(page.locator('[data-testid="sync-progress"]')).toBeVisible();

    // 4. Wait for sync complete
    await expect(page.locator('[data-testid="sync-complete-badge"]')).toBeVisible({ timeout: 30000 });
  });

  // ========== Dashboard ==========

  test('should display ads dashboard overview', async ({ page }) => {
    // 1. Navigate to ads dashboard
    await page.goto('/ads');

    // 2. Verify dashboard widgets
    await expect(page.locator('[data-testid="total-spend-card"]')).toBeVisible();
    await expect(page.locator('[data-testid="active-campaigns-count"]')).toBeVisible();
    await expect(page.locator('[data-testid="avg-position-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="top-campaigns-table"]')).toBeVisible();
  });

  // ========== Premium Feature Gating ==========

  test('should block free users from bid management', async ({ page }) => {
    // 1. Login as free user
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'free@user.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-btn"]');

    // 2. Navigate to bid management
    await page.goto('/ads/bids');

    // 3. Verify premium upgrade modal
    await expect(page.locator('[data-testid="premium-upgrade-modal"]')).toBeVisible();
  });
});
```

---

## Success Criteria

- [ ] User can create, edit, pause, resume, delete campaigns
- [ ] User can add/remove keywords to campaigns
- [ ] User can set bid amounts manually
- [ ] User can enable auto-bidding with target position
- [ ] Bid suggestions are calculated and displayed
- [ ] Campaign analytics are shown (spend, CTR, position)
- [ ] WB account can be connected and campaigns synced
- [ ] Free users see premium upgrade modal
- [ ] All E2E tests pass
- [ ] Backend: unit tests for bid calculation logic
- [ ] Frontend: component tests for bid management components
