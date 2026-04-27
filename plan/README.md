# Feature Implementation Plans

This directory contains implementation prompts and E2E test specifications for features that WBHelper lacks compared to Marpla.

## Overview

| Priority | Feature | File | Complexity |
|----------|---------|------|------------|
| 🔴 HIGH | SEO Module | [01-seo-module.md](./01-seo-module.md) | High |
| 🔴 HIGH | Bidder (Auto-Bid) | [02-bidder.md](./02-bidder.md) | High |
| 🟡 MEDIUM | A/B Test Photo | [03-ab-test-photo.md](./03-ab-test-photo.md) | Medium |
| 🟡 MEDIUM | Browser Plugin | [04-browser-plugin.md](./04-browser-plugin.md) | Medium |
| 🟡 MEDIUM | Review Bot (Telegram) | [05-review-bot-telegram.md](./05-review-bot-telegram.md) | Medium |
| 🟡 MEDIUM | Position Bot (Telegram) | [06-position-bot-telegram.md](./06-position-bot-telegram.md) | Low |
| 🟡 MEDIUM | Ad Rate Bot (Telegram) | [07-ad-rate-bot-telegram.md](./07-ad-rate-bot-telegram.md) | Low |
| 🟢 LOW | Category Guide | [08-category-guide.md](./08-category-guide.md) | Low |

---

## Quick Start

To implement any feature:

1. **Read the feature file** — Contains full implementation prompt with:
   - Context loading instructions
   - Database schema
   - API endpoints
   - Frontend components
   - Integration points

2. **Load required context files**:
   ```
   @.opencode/context/core/standards/code-quality.md
   @.opencode/context/core/standards/api-design.md
   ```

3. **Follow the implementation prompt** section by section

4. **Run E2E tests** to verify completion

---

## Feature Summary

### 🔴 HIGH PRIORITY

#### 1. SEO Module (`01-seo-module.md`)
**What it does**: Keyword intelligence system for Wildberries
- Track keyword positions in search results
- Detect dropped keywords (lost visibility)
- Cluster keywords by semantic similarity
- Competitor keyword analysis

**Key components**:
- `Domain/SEO.hs` — SEO domain logic
- `Integration/WB/SEO.hs` — WB API integration
- New pages: SEODashboard, KeywordTracking, DroppedKeywords, KeywordClusters, CompetitorAnalysis

#### 2. Bidder (`02-bidder.md`)
**What it does**: Automatic bid management for Wildberries advertising
- Campaign management (Search, Auto, InCard ads)
- Auto-bidding with target position
- Bid suggestions based on performance
- Budget control

**Key components**:
- `Domain/Bidding.hs` — Bid calculation logic
- `Service/BidEngine.hs` — Auto-bidding service
- `Integration/WB/Advertising.hs` — WB Ads API
- New pages: AdsDashboard, CampaignList, BidManagement, AdsAnalytics

---

### 🟡 MEDIUM PRIORITY

#### 3. A/B Test Photo (`03-ab-test-photo.md`)
**What it does**: Split-test product photos on Wildberries
- Create A/B tests with multiple variants
- Track CTR per variant
- Statistical significance calculation
- Winner determination

**Key components**:
- `Domain/ABTesting.hs` — Statistical calculations
- New pages: ABTestList, ABTestDetail, ABTestResults

#### 4. Browser Plugin (`04-browser-plugin.md`)
**What it does**: Chrome/Firefox/Edge extension for ad management
- Inject UI into WB seller dashboard
- Quick bid adjustments inline
- Popup with campaign overview
- Real-time stats badge

**Key components**:
- `browser-extension/` — New extension project
- `manifest.json` — Extension manifest v3
- Content script for WB dashboard injection

#### 5. Review Bot (`05-review-bot-telegram.md`)
**What it does**: GPT-4 powered auto-responses to reviews
- Telegram bot interface
- Response rules with keyword matching
- AI-generated responses
- Manual override capability

**Key components**:
- `Service/TelegramReviewBot.hs` — Bot service
- `Service/ReviewResponseGenerator.hs` — AI response generation
- New pages: ReviewBotSettings, ReviewRules, ReviewTemplates, ReviewList

#### 6. Position Bot (`06-position-bot-telegram.md`)
**What it does**: Track product positions via Telegram
- Deep search (up to 10,000 positions)
- Indexation checking
- Position change alerts
- Historical tracking

**Key components**:
- `Service/TelegramPositionBot.hs` — Bot service
- `Service/PositionChecker.hs` — Position checking logic
- New pages: PositionSettings, PositionProducts, PositionAlerts

#### 7. Ad Rate Bot (`07-ad-rate-bot-telegram.md`)
**What it does**: Quick ad bid management via Telegram
- Campaign list and details
- Quick bid updates
- Pause/resume campaigns
- Budget control

**Key components**:
- `Service/TelegramAdBot.hs` — Bot service (reuses BidEngine)
- New page: AdBotSettings

---

### 🟢 LOW PRIORITY

#### 8. Category Guide (`08-category-guide.md`)
**What it does**: Wildberries category documentation
- Category tree navigation
- Requirements per category
- Tips and best practices
- Subcategory hierarchy

**Key components**:
- Simple database for static content
- New pages: CategoryGuide, CategoryDetail
- Seed data for WB categories

---

## Implementation Order Recommendation

1. **SEO Module** — High value, differentiates your AI capabilities
2. **Bidder** — Core revenue feature (10K+ users at Marpla)
3. **Review Bot** — Good ROI, simple Telegram integration
4. **Position Bot** — Related to SEO, shares infrastructure
5. **A/B Test Photo** — Complements SEO module
6. **Ad Rate Bot** — Can reuse Bidder infrastructure
7. **Browser Plugin** — Good for user engagement
8. **Category Guide** — Content-only, lowest priority

---

## Shared Patterns

All Telegram bots share:
- Similar bot service structure
- Same authentication pattern
- Reusable command handlers

All advertising features share:
- `Domain.Bidding` for bid calculations
- `Integration.WB.Advertising` for API
- Campaign management UI patterns

All SEO features share:
- Keyword tracking infrastructure
- Position checking logic
- AI clustering capabilities

---

## Testing Strategy

Each feature includes:
- **Unit tests** for domain logic
- **Component tests** for UI components
- **E2E tests** in `tests/e2e/` directory
- **Integration tests** for API endpoints

Run all tests:
```bash
# Backend
cabal test

# Frontend
npm test

# E2E
npm run test:e2e
```

---

## Files Created

```
plan/
├── README.md                           # This file
├── 01-seo-module.md                    # SEO Module implementation
├── 02-bidder.md                       # Bidder implementation
├── 03-ab-test-photo.md                # A/B Test Photo implementation
├── 04-browser-plugin.md               # Browser Plugin implementation
├── 05-review-bot-telegram.md          # Review Bot implementation
├── 06-position-bot-telegram.md        # Position Bot implementation
├── 07-ad-rate-bot-telegram.md         # Ad Rate Bot implementation
└── 08-category-guide.md               # Category Guide implementation
```
