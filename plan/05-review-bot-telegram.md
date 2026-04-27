# Feature: Telegram Review Bot — Auto-Response to Reviews

## Overview

**Marpla Review Bot** is a Telegram bot that automatically responds to Wildberries reviews:
- GPT-4 powered responses to reviews 24/7
- No limits on number of reviews or shops
- Simple installation and management
- Automatic tone matching
- Supports different response templates

---

## Implementation Prompt

### Context Loading

Before implementing, load the following context files:
```
@.opencode/context/core/standards/api-design.md
@.opencode/context/core/standards/code-quality.md
```

Also load reference files:
- Backend: `backend/src/AI/OpenRouter.hs`, `backend/src/Domain/*.hs`
- Frontend: `frontend/src/stores/authStore.ts`

---

### 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Telegram Bot                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │ Review      │  │ Response    │  │ Settings    │   │
│  │ Monitor     │  │ Generator   │  │ Manager     │   │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘   │
│         │                │                 │           │
│         └────────────────┼─────────────────┘           │
│                          │                              │
│                    ┌─────▼─────┐                        │
│                    │  GPT-4    │                        │
│                    │  Engine   │                        │
│                    └───────────┘                        │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                    Your Backend                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │ Telegram    │  │ WB Reviews  │  │ Response    │   │
│  │ API Client  │  │ Parser      │  │ Storage     │   │
│  └─────────────┘  └─────────────┘  └─────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

### 2. Backend Implementation

#### 2.1 Database Schema

Create new tables in `backend/src/Database/Schema.hs`:

```haskell
-- Telegram bot configuration
TelegramBotConfig
    configId Text PRIMARY KEY
    userId UserId
    botToken Text Maybe           -- Botfather token for this user
    telegramChatId Text Maybe     -- Connected chat ID
    status BotStatus
    createdAt UTCTime
    updatedAt UTCTime
    deriving Eq Show

data BotStatus
    = BotInactive
    | BotActive
    | BotError Text
    deriving Eq Show

-- Review response rules
ReviewResponseRule
    ruleId Text PRIMARY KEY
    userId UserId
    ruleName Text
    keywords [Text]               -- Match keywords in review
    responseTemplate Text         -- Template or "AI_GENERATED"
    sentiment Sentiment           -- Which sentiment to apply
    isActive Bool Default=True
    derived Eq Show

data Sentiment
    = SentimentPositive
    | SentimentNegative
    | SentimentNeutral
    deriving (Eq, Show)

-- Processed reviews
ProcessedReview
    reviewId Text PRIMARY KEY
    botConfigId Text
    articleId Text
    reviewText Text
    reviewRating Int
    reviewerName Text
    botResponse Text Maybe
    processedAt UTCTime Maybe
    status ReviewStatus
    derived Eq Show

data ReviewStatus
    = ReviewPending
    | ReviewResponded
    | ReviewSkipped
    | ReviewFailed
    deriving Eq Show

-- Response templates
ResponseTemplate
    templateId Text PRIMARY KEY
    userId UserId
    templateName Text
    templateText Text            -- With {{variables}}
    sentiment Sentiment
    isDefault Bool Default=False
    derived Eq Show
```

#### 2.2 New API Endpoints

Add to `backend/src/Api/Routes.hs`:

```haskell
-- Bot Configuration
GET    /telegram/reviews/config          -- Get bot configuration
POST   /telegram/reviews/config          -- Create/update config
POST   /telegram/reviews/connect        -- Connect Telegram chat
POST   /telegram/reviews/disconnect     -- Disconnect Telegram

-- Response Rules
GET    /telegram/reviews/rules           -- List response rules
POST   /telegram/reviews/rules          -- Create rule
PUT    /telegram/reviews/rules/:id      -- Update rule
DELETE /telegram/reviews/rules/:id       -- Delete rule

-- Response Templates
GET    /telegram/reviews/templates       -- List templates
POST   /telegram/reviews/templates       -- Create template
PUT    /telegram/reviews/templates/:id   -- Update template
DELETE /telegram/reviews/templates/:id  -- Delete template

-- Review Management
GET    /telegram/reviews                 -- List processed reviews
GET    /telegram/reviews/:id             -- Get review details
POST   /telegram/reviews/:id/reply       -- Send manual reply
POST   /telegram/reviews/:id/skip        -- Skip this review

-- Statistics
GET    /telegram/reviews/stats           -- Bot statistics
GET    /telegram/reviews/stats/daily     -- Daily breakdown
```

#### 2.3 Telegram Bot Service

Create `backend/src/Service/TelegramReviewBot.hs`:

```haskell
module Service.TelegramReviewBot where

-- Bot configuration
data BotConfig = BotConfig
    { botToken     :: Text
    , chatId       :: Text
    , apiEndpoint  :: Text
    } deriving (Eq, Show)

-- Telegram update types
data TelegramUpdate = TelegramUpdate
    { updateId   :: Int
    , message    :: Maybe Message
    , callbackQuery :: Maybe CallbackQuery
    } deriving (Eq, Show)

data Message = Message
    { messageId  :: Int
    , chat       :: Chat
    , text       :: Maybe Text
    } deriving (Eq, Show)

-- Main bot loop
runReviewBot :: BotConfig -> IO ()
runReviewBot config = do
    -- Poll for updates
    forever $ do
        updates <- getUpdates config
        processUpdates config updates
        threadDelay 1000000  -- 1 second delay between polls

-- Process incoming messages/commands
processUpdates :: BotConfig -> [TelegramUpdate] -> IO ()
processUpdates config updates = forM_ updates $ \update ->
    case update.message of
        Just msg -> handleMessage config msg
        Nothing -> return ()

-- Handle /start command
handleStart :: BotConfig -> Message -> IO ()
handleStart config msg = do
    let chatId = show $ chatId $ msg.chat
    sendMessage config chatId "Добро пожаловать в WBHelper Review Bot!"

-- Handle /status command
handleStatus :: BotConfig -> Message -> IO ()
handleStatus config msg = do
    stats <- getBotStats (configUserId config)
    let response = formatStats stats
    sendMessage config (getChatId msg) response

-- Handle /stats command
handleStats :: BotConfig -> Message -> IO ()
handleStats config msg = do
    stats <- getBotStats (configUserId config)
    sendMessage config (getChatId msg) (formatDetailedStats stats)

-- Send message to Telegram
sendMessage :: BotConfig -> Text -> Text -> IO ()
sendMessage config chatId text = do
    let url = botApiEndpoint config <> "/sendMessage"
    let body = object ["chat_id" .= chatId, "text" .= text]
    void $ httpPost url body
```

#### 2.4 Review Response Generator

Create `backend/src/Service/ReviewResponseGenerator.hs`:

```haskell
module Service.ReviewResponseGenerator where

-- Generate response to review using AI
generateReviewResponse
    :: (AI m)
    => Review                    -- Original review
    -> [ResponseRule]            -- Active rules
    -> [ResponseTemplate]        -- Available templates
    -> m GeneratedResponse

data GeneratedResponse = GeneratedResponse
    { responseText   :: Text
    , confidence     :: Double
    , templateUsed   :: Maybe Text
    , sentiment      :: Sentiment
    } deriving (Eq, Show)

-- Analyze review sentiment
analyzeSentiment :: Text -> Sentiment
analyzeSentiment text
    | hasNegativeWords text = SentimentNegative
    | hasPositiveWords text = SentimentPositive
    | otherwise = SentimentNeutral

-- Match rule based on keywords
matchRule :: Text -> [ResponseRule] -> Maybe ResponseRule
matchRule reviewText rules =
    find (\rule -> any (`isInfixOf` reviewText) (ruleKeywords rule)) rules

-- Generate AI response
generateAIResponse
    :: (AI m)
    => Review
    -> Sentiment
    -> m Text
generateAIResponse review sentiment = do
    let prompt = buildPrompt review sentiment
    response <- callAI prompt
    return $ extractResponse response

-- Build prompt for AI
buildPrompt :: Review -> Sentiment -> Text
buildPrompt review sentiment = T.intercalate "\n"
    [ "Ты — вежливый представитель службы поддержки магазина на Wildberries."
    , "Напиши ответ на следующий отзыв:"
    , ""
    , T.reviewText review
    , ""
    , "Тон: " <> sentimentToTone sentiment
    , ""
    , "Требования:"
    , "- Ответ должен быть кратким (до 200 символов)"
    , "- Вежливый и профессиональный"
    , "- Не копировать текст отзыва"
    , "- Предложить помощь если негатив"
    ]

sentimentToTone :: Sentiment -> Text
sentimentToTone SentimentPositive = "благодарный и дружелюбный"
sentimentToTone SentimentNegative = "сочувствующий и готовый помочь"
sentimentToTone SentimentNeutral = "нейтральный и информативный"
```

#### 2.5 WB Reviews Integration

Create `backend/src/Integration/WB/Reviews.hs`:

```haskell
module Integration.WB.Reviews where

class WBReviewsClient m where
    -- Get reviews for product
    getProductReviews
        :: Text              -- article ID
        -> Day                -- date from
        -> Day                -- date to
        -> m [WBReview]

    -- Get new reviews (for bot polling)
    getNewReviews
        :: UTCTime            -- since
        -> m [WBReview]

data WBReview = WBReview
    { wbReviewId     :: Text
    , wbArticleId    :: Text
    , wbText         :: Text
    , wbRating       :: Int
    , wbReviewerName :: Text
    , wbCreatedAt    :: UTCTime
    , wbAnswered     :: Bool
    } deriving (Eq, Show)
```

---

### 3. Frontend Implementation

#### 3.1 Pages/Routes

Add to `frontend/src/router.tsx`:

```typescript
const TelegramReviewBotSettings = lazy(() => import('@/pages/telegram/ReviewBotSettingsPage'));
const TelegramReviewRules = lazy(() => import('@/pages/telegram/ReviewRulesPage'));
const TelegramReviewTemplates = lazy(() => import('@/pages/telegram/ReviewTemplatesPage'));
const TelegramReviewList = lazy(() => import('@/pages/telegram/ReviewListPage'));

// Routes
{ path: '/telegram/reviews/settings', element: <TelegramReviewBotSettings /> },
{ path: '/telegram/reviews/rules', element: <TelegramReviewRules /> },
{ path: '/telegram/reviews/templates', element: <TelegramReviewTemplates /> },
{ path: '/telegram/reviews', element: <TelegramReviewList /> },
```

#### 3.2 Page Components

**ReviewBotSettingsPage.tsx** — Bot setup:
- Connect Telegram bot instructions
- Bot token input field
- Test connection button
- Enable/disable bot toggle
- Webhook status indicator

**ReviewRulesPage.tsx** — Response automation rules:
- List of rules with keyword matching
- Create rule: keywords + response type
- Enable/disable rules
- Rule priority ordering

**ReviewTemplatesPage.tsx** — Response templates:
- Template list with preview
- Create/edit template with variables
- Sentiment selector
- Set as default toggle

**ReviewListPage.tsx** — Processed reviews:
- Table: Date, Product, Review, Response, Status
- Filter by status: All, Responded, Skipped, Pending
- Manual reply button
- Review detail modal with full conversation

#### 3.3 Hooks

```typescript
// hooks/useTelegramReviewBot.ts
useTelegramReviewBotConfig()
  -> { config: BotConfig, isLoading, updateConfig, connect, disconnect }

// hooks/useReviewRules.ts
useReviewRules()
  -> { rules: ResponseRule[], isLoading, createRule, updateRule, deleteRule }

// hooks/useReviewTemplates.ts
useReviewTemplates()
  -> { templates: ResponseTemplate[], isLoading, createTemplate, updateTemplate }

// hooks/useProcessedReviews.ts
useProcessedReviews(filters?: ReviewFilters)
  -> { reviews: ProcessedReview[], isLoading, manualReply, skipReview }
```

---

### 4. Telegram Bot Commands

The bot will respond to these commands:

```
/start          - Welcome message and setup guide
/help           - Show help information
/status         - Bot status and today's stats
/stats          - Detailed statistics
/reviews        - Number of reviews processed
/settings       - Open settings panel
/pause          - Pause automatic responses
/resume         - Resume automatic responses
/template       - Show current template
```

---

### 5. Integration Points

- [ ] Auth store: Premium feature gating
- [ ] Notifications: Alert when bot encounters error
- [ ] WB Integration: Poll for new reviews

---

## E2E Test Specifications

### File: `tests/e2e/telegram-review-bot.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Telegram Review Bot', () => {

  // ========== Bot Setup ==========

  test('should configure bot with token', async ({ page }) => {
    // 1. Navigate to bot settings
    await page.goto('/telegram/reviews/settings');

    // 2. Enter bot token
    await page.fill('[data-testid="bot-token-input"]', '123456:ABC-DEF');

    // 3. Save configuration
    await page.click('[data-testid="save-config-btn"]');

    // 4. Verify success
    await expect(page.locator('[data-testid="success-toast"]')).toContainText('Сохранено');
    await expect(page.locator('[data-testid="bot-status"]')).toContainText('Настроен');
  });

  test('should test bot connection', async ({ page }) => {
    // 1. Navigate to bot settings
    await page.goto('/telegram/reviews/settings');

    // 2. Click test connection
    await page.click('[data-testid="test-connection-btn"]');

    // 3. Verify connection success
    await expect(page.locator('[data-testid="connection-success"]')).toBeVisible();
  });

  test('should connect Telegram chat', async ({ page }) => {
    // 1. Navigate to bot settings
    await page.goto('/telegram/reviews/settings');

    // 2. Click connect chat
    await page.click('[data-testid="connect-chat-btn"]');

    // 3. Verify QR code or instructions shown
    await expect(page.locator('[data-testid="connect-instructions"]')).toBeVisible();
  });

  // ========== Response Rules ==========

  test('should create response rule', async ({ page }) => {
    // 1. Navigate to rules page
    await page.goto('/telegram/reviews/rules');

    // 2. Click add rule
    await page.click('[data-testid="add-rule-btn"]');

    // 3. Fill rule form
    await page.fill('[data-testid="rule-name-input"]', 'Bad Quality Response');
    await page.fill('[data-testid="keywords-input"]', 'брак,плохое качество,defect');
    await page.selectOption('[data-testid="sentiment-select"]', { label: 'Негативный' });
    await page.selectOption('[data-testid="response-type"]', { label: 'AI Generated' });

    // 4. Save rule
    await page.click('[data-testid="save-rule-btn"]');

    // 5. Verify rule appears in list
    await expect(page.locator('[data-testid="rule-card"]').first()).toContainText('Bad Quality Response');
  });

  test('should edit existing rule', async ({ page }) => {
    // 1. Navigate to rules page
    await page.goto('/telegram/reviews/rules');

    // 2. Click edit on rule
    await page.locator('[data-testid="rule-card"]').first().locator('[data-testid="edit-btn"]').click();

    // 3. Modify rule
    await page.fill('[data-testid="rule-name-input"]', 'Updated Rule Name');

    // 4. Save changes
    await page.click('[data-testid="save-rule-btn"]');

    // 5. Verify update
    await expect(page.locator('[data-testid="success-toast"]')).toContainText('Обновлено');
  });

  test('should delete rule', async ({ page }) => {
    // 1. Navigate to rules page
    await page.goto('/telegram/reviews/rules');

    // 2. Click delete on rule
    await page.locator('[data-testid="rule-card"]').first().locator('[data-testid="delete-btn"]').click();

    // 3. Confirm deletion
    await page.click('[data-testid="confirm-delete-btn"]');

    // 4. Verify removed
    await expect(page.locator('[data-testid="success-toast"]')).toContainText('Удалено');
  });

  test('should toggle rule active/inactive', async ({ page }) => {
    // 1. Navigate to rules page
    await page.goto('/telegram/reviews/rules');

    // 2. Toggle rule status
    const ruleCard = page.locator('[data-testid="rule-card"]').first();
    await ruleCard.locator('[data-testid="rule-toggle"]').click();

    // 3. Verify status changed
    await expect(ruleCard.locator('[data-testid="rule-status"]')).toContainText('Неактивен');
  });

  // ========== Response Templates ==========

  test('should create response template', async ({ page }) => {
    // 1. Navigate to templates page
    await page.goto('/telegram/reviews/templates');

    // 2. Click add template
    await page.click('[data-testid="add-template-btn"]');

    // 3. Fill template form
    await page.fill('[data-testid="template-name-input"]', 'Thank You Positive');
    await page.fill('[data-testid="template-text"]', 'Спасибо за отзыв! {{reviewer_name}}, мы рады, что вам понравился наш товар. Ждем вас снова!');
    await page.selectOption('[data-testid="sentiment-select"]', { label: 'Позитивный' });

    // 4. Save template
    await page.click('[data-testid="save-template-btn"]');

    // 5. Verify template appears
    await expect(page.locator('[data-testid="template-card"]').first()).toContainText('Thank You Positive');
  });

  test('should preview template with variables', async ({ page }) => {
    // 1. Navigate to templates page
    await page.goto('/telegram/reviews/templates');

    // 2. Click preview on template
    await page.locator('[data-testid="template-card"]').first().locator('[data-testid="preview-btn"]').click();

    // 3. Verify preview modal with filled variables
    await expect(page.locator('[data-testid="preview-text"]')).toBeVisible();
  });

  test('should set template as default', async ({ page }) => {
    // 1. Navigate to templates page
    await page.goto('/telegram/reviews/templates');

    // 2. Click set as default
    await page.locator('[data-testid="template-card"]').first().locator('[data-testid="set-default-btn"]').click();

    // 3. Verify default badge appears
    await expect(page.locator('[data-testid="template-card"]').first().locator('[data-testid="default-badge"]')).toBeVisible();
  });

  // ========== Processed Reviews ==========

  test('should list processed reviews', async ({ page }) => {
    // 1. Navigate to reviews list
    await page.goto('/telegram/reviews');

    // 2. Verify reviews table
    await expect(page.locator('[data-testid="reviews-table"]')).toBeVisible();
    await expect(page.locator('[data-testid="review-row"]').first()).toBeVisible();
  });

  test('should filter reviews by status', async ({ page }) => {
    // 1. Navigate to reviews list
    await page.goto('/telegram/reviews');

    // 2. Filter by Responded
    await page.selectOption('[data-testid="status-filter"]', { label: 'Отвечено' });

    // 3. Verify only responded reviews shown
    const rows = await page.locator('[data-testid="review-row"]').all();
    for (const row of rows) {
      await expect(row.locator('[data-testid="review-status"]')).toContainText('Отвечено');
    }
  });

  test('should send manual reply to review', async ({ page }) => {
    // 1. Navigate to reviews list
    await page.goto('/telegram/reviews');

    // 2. Click reply on pending review
    await page.locator('[data-testid="review-row"]').filter({ has: page.locator('[data-testid="review-status"]:has-text("Ожидает")') }).locator('[data-testid="reply-btn"]').click();

    // 3. Enter reply text
    await page.fill('[data-testid="reply-input"]', 'Спасибо за ваш отзыв!');

    // 4. Send reply
    await page.click('[data-testid="send-reply-btn"]');

    // 5. Verify status updated
    await expect(page.locator('[data-testid="success-toast"]')).toContainText('Отправлено');
  });

  test('should skip review', async ({ page }) => {
    // 1. Navigate to reviews list
    await page.goto('/telegram/reviews');

    // 2. Click skip on review
    await page.locator('[data-testid="review-row"]').first().locator('[data-testid="skip-btn"]').click();

    // 3. Verify status changed to Skipped
    await expect(page.locator('[data-testid="review-status"]')).toContainText('Пропущено');
  });

  // ========== Bot Control ==========

  test('should pause bot from web interface', async ({ page }) => {
    // 1. Navigate to bot settings
    await page.goto('/telegram/reviews/settings');

    // 2. Click pause bot
    await page.click('[data-testid="pause-bot-btn"]');

    // 3. Verify bot status shows Paused
    await expect(page.locator('[data-testid="bot-status"]')).toContainText('Приостановлен');
  });

  test('should resume bot from web interface', async ({ page }) => {
    // 1. Navigate to bot settings
    await page.goto('/telegram/reviews/settings');

    // 2. Click resume bot
    await page.click('[data-testid="resume-bot-btn"]');

    // 3. Verify bot status shows Active
    await expect(page.locator('[data-testid="bot-status"]')).toContainText('Активен');
  });

  // ========== Statistics ==========

  test('should display bot statistics', async ({ page }) => {
    // 1. Navigate to bot settings
    await page.goto('/telegram/reviews/settings');

    // 2. Verify stats cards displayed
    await expect(page.locator('[data-testid="total-reviews-stat"]')).toBeVisible();
    await expect(page.locator('[data-testid="today-reviews-stat"]')).toBeVisible();
    await expect(page.locator('[data-testid="response-rate-stat"]')).toBeVisible();
  });

  // ========== Premium Feature Gating ==========

  test('should block free users from bot features', async ({ page }) => {
    // 1. Login as free user
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'free@user.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-btn"]');

    // 2. Navigate to bot settings
    await page.goto('/telegram/reviews/settings');

    // 3. Verify premium upgrade modal
    await expect(page.locator('[data-testid="premium-upgrade-modal"]')).toBeVisible();
  });
});
```

---

## Success Criteria

- [ ] User can configure bot with token
- [ ] Bot connects to Telegram and responds to commands
- [ ] User can create response rules with keywords
- [ ] User can create/edit response templates
- [ ] Reviews are processed automatically based on rules
- [ ] AI generates responses for matching reviews
- [ ] Manual reply works for manual intervention
- [ ] Bot can be paused/resumed
- [ ] Statistics are displayed
- [ ] Free users see premium upgrade modal
- [ ] All E2E tests pass
- [ ] Backend: unit tests for response generation
- [ ] Frontend: component tests for bot settings
