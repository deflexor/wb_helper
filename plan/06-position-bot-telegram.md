# Feature: Telegram Position Bot — Product Position Tracking

## Overview

**Marpla Position Bot** is a Telegram bot for tracking Wildberries product positions:
- Check product card positions in search results
- Search depth up to 10,000 positions (100 pages)
- Indexation checking — verify if article appears in search
- Position change notifications
- Multiple product tracking
- Regular position checks

---

## Implementation Prompt

### Context Loading

Before implementing, load the following context files:
```
@.opencode/context/core/standards/api-design.md
@.opencode/context/core/standards/code-quality.md
```

Also load reference files:
- Backend: `backend/src/Integration/WB/SEO.hs` (for keyword position tracking)
- Frontend: `frontend/src/pages/CompetitorsPage.tsx`

---

### 1. Backend Implementation

#### 1.1 Database Schema

Create new tables in `backend/src/Database/Schema.hs`:

```haskell
-- Position tracking configuration
PositionTrackConfig
    configId Text PRIMARY KEY
    userId UserId
    telegramChatId Text
    checkIntervalHours Int Default=6
    isActive Bool Default=True
    createdAt UTCTime
    updatedAt UTCTime
    deriving Eq Show

-- Tracked products for position
TrackedProduct
    trackId Text PRIMARY KEY
    configId Text
    articleId Text
    searchQuery Text           -- Keyword to search for
    targetPosition Int Maybe    -- Desired position
    createdAt UTCTime
    deriving Eq Show

-- Position history snapshots
PositionSnapshot
    snapshotId Text PRIMARY KEY
    trackId Text
    position Int Maybe          -- Nothing if not found
    isIndexed Bool              -- Whether article found at all
    searchDepth Int             -- How deep we searched
    snapshotAt UTCTime
    deriving Eq Show

-- Alert thresholds
PositionAlert
    alertId Text PRIMARY KEY
    trackId Text
    alertType AlertType
    threshold Int               -- e.g., position > 10
    isActive Bool Default=True
    derived Eq Show

data AlertType
    = AlertPositionDrop         -- Dropped below threshold
    | AlertNotIndexed          -- No longer in search
    | AlertPositionRise        -- Improved above threshold
    deriving (Eq, Show)
```

#### 1.2 New API Endpoints

Add to `backend/src/Api/Routes.hs`:

```haskell
-- Bot Configuration
GET    /telegram/positions/config         -- Get bot configuration
POST   /telegram/positions/config         -- Create/update config
POST   /telegram/positions/connect         -- Connect Telegram chat
POST   /telegram/positions/disconnect      -- Disconnect Telegram

-- Tracked Products
GET    /telegram/positions/products       -- List tracked products
POST   /telegram/positions/products        -- Add product to track
PUT    /telegram/positions/products/:id   -- Update tracking
DELETE /telegram/positions/products/:id   -- Remove from tracking

-- Position Snapshots
GET    /telegram/positions/products/:id/history   -- Position history
POST   /telegram/positions/products/:id/check    -- Trigger immediate check

-- Alerts
GET    /telegram/positions/alerts          -- List alert rules
POST   /telegram/positions/alerts          -- Create alert rule
PUT    /telegram/positions/alerts/:id      -- Update alert
DELETE /telegram/positions/alerts/:id     -- Delete alert

-- Statistics
GET    /telegram/positions/stats           -- Overall tracking statistics
```

#### 1.3 Telegram Bot Service

Create `backend/src/Service/TelegramPositionBot.hs`:

```haskell
module Service.TelegramPositionBot where

-- Handle bot commands
handlePositionBotCommand :: BotConfig -> TelegramMessage -> IO Response

-- /start command
handleStart :: BotConfig -> ChatId -> IO ()
handleStart config chatId = sendMessage config chatId welcomeMessage

-- /track command - add product to tracking
handleTrack :: BotConfig -> ChatId -> [Text] -> IO ()
handleTrack config chatId [query, articleId] = do
    addTrackedProduct config chatId query articleId
    sendMessage config chatId $ "Добавлено: " <> articleId <> " по запросу '" <> query <> "'"

-- /untrack command - remove product
handleUntrack :: BotConfig -> ChatId -> Text -> IO ()
handleUntrack config chatId articleId = do
    removeTrackedProduct config chatId articleId
    sendMessage config chatId $ "Удалено из отслеживания: " <> articleId

-- /positions command - show all tracked positions
handlePositions :: BotConfig -> ChatId -> IO ()
handlePositions config chatId = do
    products <- getTrackedProducts config chatId
    let msg = formatPositionsList products
    sendMessage config chatId msg

-- /check command - check position now
handleCheck :: BotConfig -> ChatId -> Text -> IO ()
handleCheck config chatId articleId = do
    sendMessage config chatId "Проверяю позицию..."
    result <- checkPosition config articleId
    sendMessage config chatId $ formatPositionResult result

-- /setalert command - set position alert
handleSetAlert :: BotConfig -> ChatId -> [Text] -> IO ()
handleSetAlert config chatId [articleId, threshold] = do
    setPositionAlert config chatId articleId (read threshold)
    sendMessage config chatId $ "Алерты установлены для " <> articleId

-- Format positions list for Telegram message
formatPositionsList :: [TrackedProductStatus] -> Text
formatPositionsList products = T.intercalate "\n\n" $
    map formatProductStatus products

formatProductStatus :: TrackedProductStatus -> Text
formatProductStatus p = T.intercalate "\n"
    [ "📦 " <> p.articleId
    , "🔍 Запрос: " <> p.searchQuery
    , "📊 Позиция: " <> maybe "Не найден" showPos p.currentPosition
    , "📈 Изменение: " <> formatChange p.positionChange
    ]

showPos :: Int -> Text
showPos p = "#" <> T.pack (show p)

formatChange :: Int -> Text
formatChange 0 = "➡️ Без изменений"
formatChange n | n > 0 = "📈 +" <> T.pack (show n)
formatChange n = "📉 " <> T.pack (show n)
```

#### 1.4 Position Checker Service

Create `backend/src/Service/PositionChecker.hs`:

```haskell
module Service.PositionChecker where

-- Check position of article for given keyword
checkProductPosition
    :: (WBClient m)
    => Text              -- search query
    -> Text              -- article ID
    -> Int               -- max depth (pages)
    -> m PositionResult

data PositionResult = PositionResult
    { prPosition    :: Int Maybe
    , prIsIndexed   :: Bool
    , prSearchedDepth :: Int
    , prCheckedAt   :: UTCTime
    } deriving (Eq, Show)

-- Check multiple products
checkMultiplePositions
    :: (WBClient m)
    => [(Text, Text)]    -- [(query, articleId)]
    -> Int               -- max depth
    -> m [PositionResult]

-- Search WB and find article position
findArticlePosition
    :: (WBClient m)
    => Text              -- search query
    -> Text              -- article to find
    -> Int               -- max page
    -> m (Maybe Int)     -- position if found
findArticlePosition query articleId maxPage = go 1
  where
    go page | page > maxPage = return Nothing
    go page = do
        results <- searchWB query page
        case findIndex ((== articleId) . resultArticleId) results of
            Just idx -> return $ Just $ (page - 1) * 100 + idx + 1
            Nothing -> go (page + 1)

-- Parse search results page
parseSearchPage :: ByteString -> [SearchResult]
parseSearchPage html = ...
```

---

### 2. Frontend Implementation

#### 2.1 Pages/Routes

Add to `frontend/src/router.tsx`:

```typescript
const TelegramPositionSettings = lazy(() => import('@/pages/telegram/PositionSettingsPage'));
const TelegramPositionProducts = lazy(() => import('@/pages/telegram/PositionProductsPage'));
const TelegramPositionAlerts = lazy(() => import('@/pages/telegram/PositionAlertsPage'));

// Routes
{ path: '/telegram/positions/settings', element: <TelegramPositionSettings /> },
{ path: '/telegram/positions/products', element: <TelegramPositionProducts /> },
{ path: '/telegram/positions/alerts', element: <TelegramPositionAlerts /> },
```

#### 2.2 Page Components

**PositionSettingsPage.tsx** — Bot setup:
- Connect to Telegram bot instructions
- Set check interval
- Enable/disable tracking
- Notification preferences

**PositionProductsPage.tsx** — Tracked products:
- Table: Product, Query, Current Position, Change, Last Checked
- Add product form: article ID + search query
- Trigger check button
- Remove product button

**PositionAlertsPage.tsx** — Alert configuration:
- List of alert rules per product
- Create alert: select product, alert type, threshold
- Enable/disable alerts

#### 2.3 Hooks

```typescript
// hooks/usePositionTracking.ts
usePositionTracking()
  -> { products: TrackedProduct[], isLoading, addProduct, removeProduct, triggerCheck }

// hooks/usePositionAlerts.ts
usePositionAlerts()
  -> { alerts: PositionAlert[], isLoading, createAlert, updateAlert, deleteAlert }
```

---

### 3. Telegram Bot Commands

```
/start              - Welcome and setup guide
/help               - Show available commands
/track <query> <article>  - Add product to tracking
/untrack <article>  - Remove product from tracking
/positions          - Show all tracked positions
/check <article>    - Check position now
/setalert <article> <position>  - Alert when drops below position
/delalert <article> - Remove alerts for product
/stats              - Show tracking statistics
/settings           - Open settings
```

---

## E2E Test Specifications

### File: `tests/e2e/telegram-position-bot.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Telegram Position Bot', () => {

  // ========== Bot Setup ==========

  test('should configure position bot', async ({ page }) => {
    // 1. Navigate to position bot settings
    await page.goto('/telegram/positions/settings');

    // 2. Enter Telegram chat ID
    await page.fill('[data-testid="chat-id-input"]', '123456789');

    // 3. Set check interval
    await page.selectOption('[data-testid="check-interval"]', { label: '6 часов' });

    // 4. Save configuration
    await page.click('[data-testid="save-config-btn"]');

    // 5. Verify success
    await expect(page.locator('[data-testid="success-toast"]')).toContainText('Сохранено');
  });

  test('should connect Telegram chat', async ({ page }) => {
    // 1. Navigate to position bot settings
    await page.goto('/telegram/positions/settings');

    // 2. Click connect
    await page.click('[data-testid="connect-chat-btn"]');

    // 3. Verify instructions shown
    await expect(page.locator('[data-testid="connect-instructions"]')).toBeVisible();
  });

  // ========== Product Tracking ==========

  test('should add product to tracking', async ({ page }) => {
    // 1. Navigate to products page
    await page.goto('/telegram/positions/products');

    // 2. Click add product
    await page.click('[data-testid="add-product-btn"]');

    // 3. Fill form
    await page.fill('[data-testid="article-input"]', '123456');
    await page.fill('[data-testid="query-input"]', 'детские кроссовки');

    // 4. Submit
    await page.click('[data-testid="submit-product-btn"]');

    // 5. Verify product appears in list
    await expect(page.locator('[data-testid="product-row"]')).toContainText('123456');
    await expect(page.locator('[data-testid="success-toast"]')).toContainText('Добавлено');
  });

  test('should remove product from tracking', async ({ page }) => {
    // 1. Navigate to products page
    await page.goto('/telegram/positions/products');

    // 2. Click remove on product
    await page.locator('[data-testid="product-row"]').first().locator('[data-testid="remove-btn"]').click();

    // 3. Confirm removal
    await page.click('[data-testid="confirm-remove-btn"]');

    // 4. Verify removed
    await expect(page.locator('[data-testid="success-toast"]')).toContainText('Удалено');
  });

  test('should trigger immediate position check', async ({ page }) => {
    // 1. Navigate to products page
    await page.goto('/telegram/positions/products');

    // 2. Click check button
    await page.locator('[data-testid="product-row"]').first().locator('[data-testid="check-btn"]').click();

    // 3. Verify loading indicator
    await expect(page.locator('[data-testid="checking-loader"]')).toBeVisible();

    // 4. Wait for check to complete
    await expect(page.locator('[data-testid="product-row"]').first().locator('[data-testid="last-checked"]')).toBeVisible();
  });

  // ========== Position Alerts ==========

  test('should create position alert', async ({ page }) => {
    // 1. Navigate to alerts page
    await page.goto('/telegram/positions/alerts');

    // 2. Click add alert
    await page.click('[data-testid="add-alert-btn"]');

    // 3. Fill alert form
    await page.selectOption('[data-testid="product-select"]', { label: '123456' });
    await page.selectOption('[data-testid="alert-type"]', { label: 'Позиция опустилась ниже' });
    await page.fill('[data-testid="threshold-input"]', '10');

    // 4. Save
    await page.click('[data-testid="save-alert-btn"]');

    // 5. Verify alert appears
    await expect(page.locator('[data-testid="alert-card"]').first()).toBeVisible();
  });

  test('should delete alert rule', async ({ page }) => {
    // 1. Navigate to alerts page
    await page.goto('/telegram/positions/alerts');

    // 2. Click delete on alert
    await page.locator('[data-testid="alert-card"]').first().locator('[data-testid="delete-btn"]').click();

    // 3. Confirm
    await page.click('[data-testid="confirm-delete-btn"]');

    // 4. Verify removed
    await expect(page.locator('[data-testid="success-toast"]')).toContainText('Удалено');
  });

  // ========== Position History ==========

  test('should display position history chart', async ({ page }) => {
    // 1. Navigate to products page
    await page.goto('/telegram/positions/products');

    // 2. Click view history on product
    await page.locator('[data-testid="product-row"]').first().locator('[data-testid="history-btn"]').click();

    // 3. Verify history chart displayed
    await expect(page.locator('[data-testid="position-history-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="chart-line"]')).toBeVisible();
  });

  // ========== Statistics ==========

  test('should display tracking statistics', async ({ page }) => {
    // 1. Navigate to settings
    await page.goto('/telegram/positions/settings');

    // 2. Verify stats cards
    await expect(page.locator('[data-testid="tracked-products-count"]')).toBeVisible();
    await expect(page.locator('[data-testid="avg-position-stat"]')).toBeVisible();
    await expect(page.locator('[data-testid="alerts-triggered-stat"]')).toBeVisible();
  });

  // ========== Premium Feature Gating ==========

  test('should block free users from position tracking', async ({ page }) => {
    // 1. Login as free user
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'free@user.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-btn"]');

    // 2. Navigate to position bot
    await page.goto('/telegram/positions/products');

    // 3. Verify premium upgrade modal
    await expect(page.locator('[data-testid="premium-upgrade-modal"]')).toBeVisible();
  });
});
```

---

## Success Criteria

- [ ] User can configure Telegram bot connection
- [ ] User can add/remove products to track
- [ ] Position check works with deep search (up to 10,000)
- [ ] Indexation checking works
- [ ] Position history is recorded and displayed
- [ ] Alerts can be configured
- [ ] Bot commands work via Telegram
- [ ] Statistics displayed
- [ ] Free users see premium upgrade modal
- [ ] All E2E tests pass
