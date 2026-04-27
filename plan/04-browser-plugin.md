# Feature: Browser Plugin — Chrome/Firefox/Edge Extension

## Overview

**Marpla Browser Plugin** is a browser extension for direct ad management in Wildberries seller dashboard:
- Works in Chrome, Firefox, Edge
- 3,000+ active sellers
- Direct ad management from WB interface
- No need to switch between dashboards
- Real-time bid adjustments
- Campaign performance at a glance

---

## Implementation Prompt

### Context Loading

Before implementing, load the following context files:
```
@.opencode/context/core/standards/code-quality.md
@.opencode/context/standards/frontend-architecture.md
```

Also load reference files:
- Frontend: `frontend/src/components/*`, `frontend/src/stores/*`

---

### 1. Project Structure

Create new directory for browser extension:

```
browser-extension/
├── manifest.json           -- Extension manifest (v3)
├── src/
│   ├── background/         -- Service worker
│   │   └── service-worker.ts
│   ├── content/            -- Content scripts
│   │   └── wb-dashboard.ts
│   ├── popup/              -- Extension popup UI
│   │   ├── popup.html
│   │   ├── popup.ts
│   │   └── popup.css
│   ├── options/            -- Options page
│   │   ├── options.html
│   │   ├── options.ts
│   │   └── options.css
│   ├── components/         -- Shared UI components
│   │   ├── CampaignCard.ts
│   │   ├── BidInput.ts
│   │   └── StatsBadge.ts
│   ├── hooks/              -- Shared hooks
│   │   ├── useStorage.ts
│   │   └── useApi.ts
│   ├── api/                -- API client for backend
│   │   └── client.ts
│   ├── utils/              -- Utilities
│   │   ├── wb-api.ts       -- WB dashboard API parsing
│   │   └── logger.ts
│   └── types/              -- TypeScript types
│       └── index.ts
├── assets/                 -- Icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── tests/                  -- Extension tests
│   ├── e2e/
│   │   └── extension.spec.ts
│   └── unit/
└── README.md
```

---

### 2. Extension Manifest

```json
// manifest.json
{
  "manifest_version": 3,
  "name": "WBHelper - Управление рекламой",
  "version": "1.0.0",
  "description": "Управление рекламой Wildberries прямо из кабинета продавца",
  "permissions": [
    "storage",
    "activeTab",
    "scripting"
  ],
  "host_permissions": [
    "https://seller.wildberries.ru/*",
    "https://advertising.wildberries.ru/*",
    "https://api.wbhelper.com/*"
  ],
  "action": {
    "default_popup": "src/popup/popup.html",
    "default_icon": {
      "16": "assets/icon16.png",
      "48": "assets/icon48.png",
      "128": "assets/icon128.png"
    }
  },
  "options_page": "src/options/options.html",
  "background": {
    "service_worker": "src/background/service-worker.js"
  },
  "content_scripts": [
    {
      "matches": [
        "https://seller.wildberries.ru/*",
        "https://advertising.wildberries.ru/*"
      ],
      "js": ["src/content/wb-dashboard.js"],
      "run_at": "document_idle"
    }
  ],
  "icons": {
    "16": "assets/icon16.png",
    "48": "assets/icon48.png",
    "128": "assets/icon128.png"
  }
}
```

---

### 3. Backend API Endpoints for Extension

Add to `backend/src/Api/Routes.hs`:

```haskell
-- Extension Authentication
POST   /ext/auth/connect          -- Connect extension to account
POST   /ext/auth/disconnect         -- Disconnect extension
GET    /ext/auth/status             -- Check connection status

-- Extension Data Sync
GET    /ext/campaigns               -- Get campaigns for extension display
GET    /ext/campaigns/:id/summary    -- Quick summary for popup
POST   /ext/campaigns/:id/bid       -- Quick bid update
GET    /ext/stats/today             -- Today's stats for badge
```

---

### 4. Core Components

#### 4.1 Service Worker (Background)

```typescript
// src/background/service-worker.ts

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Show welcome page or guide
  }
});

// Handle messages from content script and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'GET_CAMPAIGNS':
      fetchCampaigns().then(sendResponse);
      return true;
    case 'UPDATE_BID':
      updateBid(message.campaignId, message.keywordId, message.bid)
        .then(sendResponse);
      return true;
    case 'GET_STATS':
      fetchTodayStats().then(sendResponse);
      return true;
  }
});

// Periodic sync for badge updates
chrome.alarms.create('syncStats', { periodInMinutes: 5 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'syncStats') {
    syncStatsAndUpdateBadge();
  }
});
```

#### 4.2 Content Script (WB Dashboard Integration)

```typescript
// src/content/wb-dashboard.ts

// Inject UI elements into WB seller dashboard
function injectUI(): void {
  // Find campaign tables and add inline controls
  const campaignRows = document.querySelectorAll('.campaign-row');
  campaignRows.forEach(row => {
    injectBidControls(row);
    injectQuickStats(row);
  });

  // Add floating action button
  createFloatingButton();
}

// Inject bid adjustment controls into campaign row
function injectBidControls(row: Element): void {
  const currentBid = extractCurrentBid(row);
  const controls = createElement(`
    <div class="wbhelper-bid-controls">
      <button class="wbhelper-btn wbhelper-btn-decrease">-</button>
      <input type="number" value="${currentBid}" step="0.1" />
      <button class="wbhelper-btn wbhelper-btn-increase">+</button>
      <button class="wbhelper-btn wbhelper-btn-apply">OK</button>
    </div>
  `);
  row.appendChild(controls);
}

// Extract data from WB dashboard page
function extractCampaignData(): CampaignData[] {
  // Parse campaign table
  const rows = document.querySelectorAll('.campaign-row');
  return Array.from(rows).map(row => ({
    id: row.dataset.campaignId,
    name: row.querySelector('.campaign-name')?.textContent,
    status: row.querySelector('.campaign-status')?.textContent,
    spend: parseMoney(row.querySelector('.campaign-spend')?.textContent),
    clicks: parseInt(row.querySelector('.campaign-clicks')?.textContent),
    ctr: parseFloat(row.querySelector('.campaign-ctr')?.textContent),
  }));
}

// Listen for WB dashboard changes (SPA navigation)
const observer = new MutationObserver(() => {
  if (isOnCampaignsPage()) {
    injectUI();
  }
});
```

#### 4.3 Popup UI

```typescript
// src/popup/popup.ts

// Display campaigns list in popup
async function renderCampaigns(): Promise<void> {
  const campaigns = await chrome.runtime.sendMessage({ type: 'GET_CAMPAIGNS' });

  const container = document.getElementById('campaigns-list');
  container.innerHTML = campaigns.map(c => `
    <div class="campaign-card">
      <div class="campaign-header">
        <span class="campaign-name">${c.name}</span>
        <span class="campaign-status ${c.status}">${c.status}</span>
      </div>
      <div class="campaign-stats">
        <div class="stat">
          <span class="stat-label">Расход</span>
          <span class="stat-value">${c.spend}₽</span>
        </div>
        <div class="stat">
          <span class="stat-label">Клики</span>
          <span class="stat-value">${c.clicks}</span>
        </div>
        <div class="stat">
          <span class="stat-label">CTR</span>
          <span class="stat-value">${c.ctr}%</span>
        </div>
      </div>
    </div>
  `).join('');
}

// Handle bid quick-update from popup
document.addEventListener('click', async (e) => {
  if (e.target.matches('.quick-bid-btn')) {
    const campaignId = e.target.dataset.campaignId;
    const bid = parseFloat((e.target.previousElementSibling as HTMLInputElement).value);

    await chrome.runtime.sendMessage({
      type: 'UPDATE_BID',
      campaignId,
      bid
    });

    showToast('Ставка обновлена');
  }
});
```

#### 4.4 Options Page

```typescript
// src/options/options.ts

interface Options {
  apiEndpoint: string;
  autoRefresh: boolean;
  refreshInterval: number;
  showNotifications: boolean;
}

// Load and display options
async function loadOptions(): Promise<void> {
  const stored = await chrome.storage.sync.get(['options']);
  setFormValues(stored.options);
}

// Save options
async function saveOptions(options: Options): Promise<void> {
  await chrome.storage.sync.set({ options });
  showToast('Настройки сохранены');
}
```

---

### 5. WB Dashboard API Client

```typescript
// src/utils/wb-api.ts

// Parse WB seller dashboard API responses
export function parseWBDashboard(): void {
  // WB uses internal API endpoints we can intercept
  const apiBase = 'https://seller.wildberries.ru/api/v1';

  // Listen to fetch requests
  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    const response = await originalFetch(...args);
    const url = args[0] as string;

    if (url.includes('/advertising/campaigns')) {
      const data = await response.clone().json();
      cacheCampaigns(data);
    }

    return response;
  };
}

// Get campaign data from WB internal state
export function getCampaignFromDOM(): Campaign[] {
  // WB uses Redux, we can access store via window
  const store = (window as any).__REDUX_DEVTOOLS_EXTENSION__?.store;
  if (store) {
    return store.getState().advertising.campaigns;
  }
  return [];
}
```

---

### 6. Styling

```css
/* src/popup/popup.css */

.wbhelper-popup {
  width: 320px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #1a1a2e;
  color: #eee;
}

.wbhelper-header {
  padding: 12px 16px;
  background: #16213e;
  border-bottom: 1px solid #0f3460;
}

.wbhelper-title {
  font-size: 16px;
  font-weight: 600;
  color: #e94560;
}

.wbhelper-campaigns {
  max-height: 400px;
  overflow-y: auto;
}

.wbhelper-campaign-card {
  padding: 12px 16px;
  border-bottom: 1px solid #0f3460;
}

.wbhelper-campaign-card:hover {
  background: #16213e;
}

.wbhelper-bid-controls {
  display: flex;
  gap: 4px;
  margin-top: 8px;
}

.wbhelper-btn {
  padding: 4px 8px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  background: #e94560;
  color: white;
}

.wbhelper-btn:hover {
  background: #c73e54;
}

/* Content script injected styles */
.wbhelper-injected {
  position: fixed;
  right: 20px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 9999;
}
```

---

## E2E Test Specifications

### File: `browser-extension/tests/e2e/extension.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('WBHelper Browser Extension', () => {

  // ========== Popup UI ==========

  test('should display popup with campaigns list', async ({ page }) => {
    // 1. Open extension popup
    await page.goto('chrome-extension://EXTENSION_ID/src/popup/popup.html');

    // 2. Verify header displayed
    await expect(page.locator('.wbhelper-header')).toBeVisible();
    await expect(page.locator('.wbhelper-title')).toContainText('WBHelper');

    // 3. Verify campaigns list loaded
    await expect(page.locator('.wbhelper-campaigns')).toBeVisible();
  });

  test('should show campaign stats in popup', async ({ page }) => {
    // 1. Open extension popup
    await page.goto('chrome-extension://EXTENSION_ID/src/popup/popup.html');

    // 2. Verify campaign card with stats
    const card = page.locator('.wbhelper-campaign-card').first();
    await expect(card.locator('.campaign-name')).toBeVisible();
    await expect(card.locator('.stat-value').first()).toBeVisible();
  });

  test('should filter campaigns by status in popup', async ({ page }) => {
    // 1. Open extension popup
    await page.goto('chrome-extension://EXTENSION_ID/src/popup/popup.html');

    // 2. Select status filter
    await page.selectOption('.wbhelper-status-filter', 'active');

    // 3. Verify only active campaigns shown
    const cards = await page.locator('.wbhelper-campaign-card').all();
    for (const card of cards) {
      await expect(card.locator('.campaign-status')).toContainText('Активна');
    }
  });

  // ========== Bid Controls ==========

  test('should update bid from popup', async ({ page }) => {
    // 1. Open extension popup
    await page.goto('chrome-extension://EXTENSION_ID/src/popup/popup.html');

    // 2. Enter new bid value
    const bidInput = page.locator('.bid-input').first();
    await bidInput.fill('10.50');

    // 3. Click apply button
    await page.locator('.quick-bid-btn').first().click();

    // 4. Verify success toast
    await expect(page.locator('.wbhelper-toast')).toContainText('Ставка обновлена');
  });

  test('should increment bid with +/- buttons', async ({ page }) => {
    // 1. Open extension popup
    await page.goto('chrome-extension://EXTENSION_ID/src/popup/popup.html');

    // 2. Get initial bid value
    const bidInput = page.locator('.bid-input').first();
    const initialBid = await bidInput.inputValue();

    // 3. Click increase button
    await page.locator('.wbhelper-btn-increase').first().click();

    // 4. Verify bid increased by 0.5 (or configured step)
    const newBid = await bidInput.inputValue();
    expect(parseFloat(newBid)).toBe(parseFloat(initialBid) + 0.5);
  });

  // ========== Options Page ==========

  test('should save API endpoint in options', async ({ page }) => {
    // 1. Open options page
    await page.goto('chrome-extension://EXTENSION_ID/src/options/options.html');

    // 2. Enter API endpoint
    await page.fill('#api-endpoint', 'https://api.myapp.com');

    // 3. Save options
    await page.click('#save-btn');

    // 4. Verify toast and settings persisted
    await expect(page.locator('.wbhelper-toast')).toContainText('Сохранено');
  });

  test('should toggle auto-refresh setting', async ({ page }) => {
    // 1. Open options page
    await page.goto('chrome-extension://EXTENSION_ID/src/options/options.html');

    // 2. Toggle auto-refresh
    const toggle = page.locator('#auto-refresh-toggle');
    const initialState = await toggle.isChecked();
    await toggle.click();

    // 3. Verify state changed
    expect(await toggle.isChecked()).toBe(!initialState);
  });

  // ========== Content Script ==========

  test('should inject controls into WB dashboard', async ({ browser }) => {
    // 1. Create browser context with extension
    const context = await browser.newContext({
      extensions: [EXTENSION_PATH]
    });

    // 2. Navigate to WB seller dashboard
    const page = await context.newPage();
    await page.goto('https://seller.wildberries.ru/supplier-settings/advertising');

    // 3. Wait for content script injection
    await page.waitForSelector('.wbhelper-injected', { timeout: 10000 });

    // 4. Verify bid controls injected
    await expect(page.locator('.wbhelper-bid-controls')).toBeVisible();
  });

  test('should update bid directly from WB dashboard', async ({ browser }) => {
    // 1. Create browser context with extension
    const context = await browser.newContext({
      extensions: [EXTENSION_PATH]
    });

    // 2. Navigate to WB seller dashboard
    const page = await context.newPage();
    await page.goto('https://seller.wildberries.ru/supplier-settings/advertising');

    // 3. Find injected bid input
    const bidInput = page.locator('.wbhelper-bid-controls input').first();
    await bidInput.fill('15.00');

    // 4. Click apply
    await page.locator('.wbhelper-btn-apply').first().click();

    // 5. Verify success feedback
    await expect(page.locator('.wbhelper-toast')).toContainText('Обновлено');
  });

  // ========== Background Service ==========

  test('should update badge with today stats', async ({ browser }) => {
    // 1. Create browser context with extension
    const context = await browser.newContext({
      extensions: [EXTENSION_PATH]
    });

    // 2. Install extension
    const extensionId = await loadExtension(context);

    // 3. Navigate to any page
    const page = await context.newPage();
    await page.goto('https://example.com');

    // 4. Check badge text
    const badgeText = await chrome.action.getBadgeText({});
    expect(badgeText).toMatch(/\d+/); // Should show some number
  });

  // ========== Authentication ==========

  test('should connect extension to user account', async ({ page }) => {
    // 1. Open extension popup
    await page.goto('chrome-extension://EXTENSION_ID/src/popup/popup.html');

    // 2. Click connect button
    await page.click('.wbhelper-connect-btn');

    // 3. Enter credentials or scan QR
    await page.fill('#user-email', 'user@example.com');
    await page.fill('#user-password', 'password');
    await page.click('#login-btn');

    // 4. Verify connected state
    await expect(page.locator('.wbhelper-connected-badge')).toBeVisible();
  });

  test('should show disconnected state when not linked', async ({ page }) => {
    // 1. Clear extension storage
    await chrome.storage.sync.clear();

    // 2. Open extension popup
    await page.goto('chrome-extension://EXTENSION_ID/src/popup/popup.html');

    // 3. Verify connect prompt shown
    await expect(page.locator('.wbhelper-connect-prompt')).toBeVisible();
  });
});
```

---

## Success Criteria

- [ ] Extension loads in Chrome, Firefox, Edge
- [ ] Popup displays campaigns list with stats
- [ ] Bid controls work from popup
- [ ] Content script injects into WB dashboard
- [ ] Bid updates work directly from dashboard
- [ ] Options page saves settings
- [ ] Badge updates with today's stats
- [ ] Extension connects to user account
- [ ] All E2E tests pass
- [ ] Extension published to Chrome Web Store
- [ ] Extension submitted to Firefox Add-ons
- [ ] Extension submitted to Edge Add-ons
