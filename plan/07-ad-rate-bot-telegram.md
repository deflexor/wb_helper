# Feature: Telegram Ad Rate Bot — Advertising Bid Rate Management

## Overview

**Marpla Ad Rate Bot** is a Telegram bot for managing Wildberries advertising bid rates:
- Manage ad bid rates directly from Telegram
- Quick bid adjustments
- Campaign performance at a glance
- Budget control commands
- Multiple campaign support

---

## Implementation Prompt

### Context Loading

Before implementing, load the following context files:
```
@.opencode/context/core/standards/api-design.md
@.opencode/context/core/standards/code-quality.md
```

Also load reference files:
- Backend: `backend/src/Service/BidEngine.hs` (from Bidder feature)
- Backend: `backend/src/Integration/WB/Advertising.hs`

---

### 1. Architecture

This bot shares infrastructure with the **Bidder** feature but provides a Telegram interface:

```
Telegram Ad Rate Bot
        │
        ├── Uses same BidEngine service
        ├── Uses same WB Advertising integration
        └── Telegram-specific UI formatting
```

---

### 2. Backend Implementation

#### 2.1 New API Endpoints

Add to `backend/src/Api/Routes.hs`:

```haskell
-- Telegram Ad Bot Configuration
GET    /telegram/ads/config              -- Get bot configuration
POST   /telegram/ads/config              -- Create/update config
POST   /telegram/ads/connect             -- Connect Telegram chat
POST   /telegram/ads/disconnect         -- Disconnect Telegram

-- Quick Commands (mirrors Bidder but Telegram-friendly)
GET    /telegram/ads/campaigns           -- List campaigns with summaries
POST   /telegram/ads/campaigns/:id/bid  -- Quick bid update
POST   /telegram/ads/campaigns/:id/pause   -- Pause campaign
POST   /telegram/ads/campaigns/:id/resume  -- Resume campaign
```

#### 2.2 Telegram Bot Service

Create `backend/src/Service/TelegramAdBot.hs`:

```haskell
module Service.TelegramAdBot where

-- Bot commands for ad management
handleAdBotCommand :: BotConfig -> TelegramMessage -> IO Response

-- /start - welcome message
handleStart :: BotConfig -> ChatId -> IO ()
handleStart config chatId = sendMessage config chatId welcomeMessage

-- /campaigns - list all campaigns
handleCampaigns :: BotConfig -> ChatId -> IO ()
handleCampaigns config chatId = do
    campaigns <- getCampaignsSummary (configUserId config)
    let msg = formatCampaignsList campaigns
    sendMessage config chatId msg

-- /campaign <id> - show campaign details
handleCampaignDetail :: BotConfig -> ChatId -> Text -> IO ()
handleCampaignDetail config chatId campaignId = do
    campaign <- getCampaignDetail campaignId
    let msg = formatCampaignDetail campaign
    sendMessage config chatId msg

-- /bid <campaign> <amount> - set bid
handleSetBid :: BotConfig -> ChatId -> Text -> Double -> IO ()
handleSetBid config chatId campaignId amount = do
    result <- setCampaignBid campaignId amount
    case result of
        Left err -> sendMessage config chatId $ "Ошибка: " <> err
        Right _ -> sendMessage config chatId $ "Ставка установлена: " <> showBid amount

-- /pause <campaign> - pause campaign
handlePause :: BotConfig -> ChatId -> Text -> IO ()
handlePause config chatId campaignId = do
    pauseCampaign campaignId
    sendMessage config chatId $ "Кампания приостановлена: " <> campaignId

-- /resume <campaign> - resume campaign
handleResume :: BotConfig -> ChatId -> Text -> IO ()
handleResume config chatId campaignId = do
    resumeCampaign campaignId
    sendMessage config chatId $ "Кампания возобновлена: " <> campaignId

-- /stats - show today's stats
handleStats :: BotConfig -> ChatId -> IO ()
handleStats config chatId = do
    stats <- getTodayStats (configUserId config)
    let msg = formatStatsMessage stats
    sendMessage config chatId msg

-- /budget <campaign> <amount> - set daily budget
handleBudget :: BotConfig -> ChatId -> Text -> Double -> IO ()
handleBudget config chatId campaignId amount = do
    setDailyBudget campaignId amount
    sendMessage config chatId $ "Бюджет установлен: " <> showBid amount <> "/день"

-- Format helpers
formatCampaignsList :: [CampaignSummary] -> Text
formatCampaignsList campaigns = T.intercalate "\n\n" $
    map formatCampaignSummary campaigns

formatCampaignSummary :: CampaignSummary -> Text
formatCampaignSummary c = T.intercalate "\n"
    [ "📢 " <> c.campaignName
    , "   Статус: " <> statusEmoji c.status <> " " <> c.statusText
    , "   Ставка: " <> showBid c.currentBid
    , "   Расход: " <> showMoney c.spend <> "/" <> showMoney c.dailyBudget
    , "   ID: " <> c.campaignId
    ]

formatCampaignDetail :: CampaignDetail -> Text
formatCampaignDetail c = T.intercalate "\n"
    [ "📢 " <> c.campaignName
    , ""
    , "📊 Статистика сегодня:"
    , "   Показы: " <> showInt c.impressions
    , "   Клики: " <> showInt c.clicks
    , "   CTR: " <> showPercent c.ctr
    , "   Расход: " <> showMoney c.spend
    , "   Средняя позиция: #" <> showInt c.avgPosition
    , ""
    , "💰 Текущая ставка: " <> showBid c.currentBid
    , "📅 Дневной бюджет: " <> showMoney c.dailyBudget
    ]
```

---

### 3. Frontend Implementation

#### 3.1 Pages/Routes

Add to `frontend/src/router.tsx`:

```typescript
const TelegramAdBotSettings = lazy(() => import('@/pages/telegram/AdBotSettingsPage'));

// Routes
{ path: '/telegram/ads/settings', element: <TelegramAdBotSettings /> },
```

#### 3.2 Page Components

**AdBotSettingsPage.tsx** — Bot setup:
- Connect to Telegram instructions
- Enable/disable commands
- Notification preferences
- Quick command shortcuts

---

### 4. Telegram Bot Commands

```
/start              - Welcome and setup
/help               - Show commands
/campaigns          - List all campaigns
/campaign <id>      - Campaign details
/bid <id> <amount>  - Set bid amount
/pause <id>         - Pause campaign
/resume <id>        - Resume campaign
/budget <id> <sum>  - Set daily budget
/stats              - Today's statistics
/top                 - Top performing campaigns
/low                - Underperforming campaigns
```

---

## E2E Test Specifications

### File: `tests/e2e/telegram-ad-bot.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Telegram Ad Rate Bot', () => {

  // ========== Bot Setup ==========

  test('should configure ad bot', async ({ page }) => {
    // 1. Navigate to ad bot settings
    await page.goto('/telegram/ads/settings');

    // 2. Enter Telegram chat ID
    await page.fill('[data-testid="chat-id-input"]', '123456789');

    // 3. Save configuration
    await page.click('[data-testid="save-config-btn"]');

    // 4. Verify success
    await expect(page.locator('[data-testid="success-toast"]')).toContainText('Сохранено');
  });

  test('should connect Telegram chat', async ({ page }) => {
    // 1. Navigate to ad bot settings
    await page.goto('/telegram/ads/settings');

    // 2. Click connect
    await page.click('[data-testid="connect-chat-btn"]');

    // 3. Verify instructions
    await expect(page.locator('[data-testid="connect-instructions"]')).toBeVisible();
  });

  // ========== Command Configuration ==========

  test('should enable/disable commands', async ({ page }) => {
    // 1. Navigate to ad bot settings
    await page.goto('/telegram/ads/settings');

    // 2. Toggle command
    await page.locator('[data-testid="command-toggle"]:nth-child(1)').click();

    // 3. Verify state changed
    await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
  });

  // ========== Statistics ==========

  test('should display ad statistics', async ({ page }) => {
    // 1. Navigate to ad bot settings
    await page.goto('/telegram/ads/settings');

    // 2. Verify stats displayed
    await expect(page.locator('[data-testid="total-spend-stat"]')).toBeVisible();
    await expect(page.locator('[data-testid="active-campaigns-stat"]')).toBeVisible();
  });

  // ========== Premium Feature Gating ==========

  test('should block free users from ad bot', async ({ page }) => {
    // 1. Login as free user
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'free@user.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-btn"]');

    // 2. Navigate to ad bot settings
    await page.goto('/telegram/ads/settings');

    // 3. Verify premium upgrade modal
    await expect(page.locator('[data-testid="premium-upgrade-modal"]')).toBeVisible();
  });
});
```

---

## Success Criteria

- [ ] User can configure Telegram bot connection
- [ ] Bot commands work via Telegram
- [ ] Quick bid updates work
- [ ] Campaign pause/resume works
- [ ] Statistics displayed
- [ ] Free users see premium upgrade modal
- [ ] All E2E tests pass
