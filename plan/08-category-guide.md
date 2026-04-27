# Feature: Category Guide — Wildberries Category Structure Documentation

## Overview

**Marpla Category Guide** is comprehensive documentation on Wildberries category structures:
- Category hierarchy and structure
- Requirements for each category
- How to get listed in specific categories
- Subcategory navigation
- Category-specific tips and requirements

This is a **documentation/guide feature** — it doesn't require complex backend logic, mostly content management.

---

## Implementation Prompt

### Context Loading

Before implementing, load the following context files:
```
@.opencode/context/core/standards/code-quality.md
```

Also load reference files:
- Frontend: `frontend/src/pages/SettingsPage.tsx`
- Frontend: `frontend/src/components/ui/accordion.tsx` (ShadCN)

---

### 1. Backend Implementation

#### 1.1 Database Schema

```haskell
-- Category documentation
CategoryGuide
    guideId Text PRIMARY KEY
    categoryId Text
    categoryName Text
    parentId Text Maybe
    content Markdown
    requirements [Text]
    tips [Text]
    popularityScore Int Maybe
    createdAt UTCTime
    updatedAt UTCTime
    deriving Eq Show

-- Category requirements
CategoryRequirement
    reqId Text PRIMARY KEY
    categoryId Text
    requirementType RequirementType
    description Text
    isMandatory Bool
    deriving Eq Show

data RequirementType
    = ReqImages              -- Image requirements
    | ReqDescription         -- Description requirements
    | ReqCertificates        -- Certificate requirements
    | ReqAgeRestriction      -- Age restrictions
    | ReqBrand               -- Brand requirements
    deriving (Eq, Show)
```

#### 1.2 API Endpoints

```haskell
-- Category Guide
GET    /guides/categories                    -- List all categories
GET    /guides/categories/:id               -- Get category details
GET    /guides/categories/:id/requirements   -- Get category requirements
GET    /guides/categories/:id/children        -- Get subcategories
GET    /guides/categories/tree               -- Get full category tree
```

---

### 2. Frontend Implementation

#### 2.1 Pages/Routes

Add to `frontend/src/router.tsx`:

```typescript
const CategoryGuidePage = lazy(() => import('@/pages/guides/CategoryGuidePage'));
const CategoryDetailPage = lazy(() => import('@/pages/guides/CategoryDetailPage'));

// Routes
{ path: '/guides/categories', element: <CategoryGuidePage /> },
{ path: '/guides/categories/:id', element: <CategoryDetailPage /> },
```

#### 2.2 Page Components

**CategoryGuidePage.tsx** — Main guide:
- Search bar for categories
- Category tree navigation
- Popular categories section
- Category cards with icons

**CategoryDetailPage.tsx** — Category details:
- Category header with breadcrumb
- Requirements accordion
- Tips section
- Related categories
- Subcategories list

#### 2.3 UI Components

Create in `frontend/src/components/guides/`:

```
CategoryTree.tsx          -- Collapsible category tree
CategoryCard.tsx           -- Category preview card
RequirementsAccordion.tsx  -- Requirements list
CategoryBreadcrumb.tsx      -- Navigation breadcrumb
CategorySearch.tsx         -- Search with filters
```

---

### 3. Content Structure

Categories from Marpla:

```
Одежда (Clothing)
├── Основной раздел
├── Офис/большие размеры/одежда для дома
├── Будущие мамы
├── Для высоких/невысоких и религиозная
├── Женщины: бельё
├── Мужчины: бельё
├── Спецодежда и СИЗы
├── Пляжная одежда
├── Свадьба (для невест)
├── Свадьба (для жениха)
├── Свадьба (для подружек невесты)

Подарки (Gifts)

Обувь (Shoes)
├── Основной раздел
├── Обувь для малышей

Детям (For Kids)

Дом (Home)
├── Основной раздел
├── Спальня и детская
├── Отдых на природе и другие
├── Досуг и творчество – творчество и рукоделие

Красота (Beauty)

Электроника (Electronics)

Игрушки (Toys)

Книги (Books)

Спорт (Sports)

Зоотовары (Pet Supplies)

Ювелирные изделия (Jewelry)
```

---

### 4. Seed Data

Create initial category data from Marpla's documentation:

```haskell
initialCategories :: [CategoryGuide]
initialCategories =
    [ CategoryGuide "cloth-main" "Одежда" "Основной раздел" Nothing
        "Основной раздел одежды на Wildberries" [...]
    , CategoryGuide "cloth-home" "Одежда" "Офис/большие размеры/одежда для дома" (Just "cloth")
        "Одежда для дома и офиса, большие размеры" [...]
    -- ... etc
    ]
```

---

## E2E Test Specifications

### File: `tests/e2e/category-guide.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Category Guide', () => {

  // ========== Category Browse ==========

  test('should display category tree', async ({ page }) => {
    // 1. Navigate to category guide
    await page.goto('/guides/categories');

    // 2. Verify category tree displayed
    await expect(page.locator('[data-testid="category-tree"]')).toBeVisible();
    await expect(page.locator('[data-testid="category-node"]').first()).toBeVisible();
  });

  test('should expand category to show children', async ({ page }) => {
    // 1. Navigate to category guide
    await page.goto('/guides/categories');

    // 2. Click expand on parent category
    await page.locator('[data-testid="category-node"]').first().locator('[data-testid="expand-btn"]').click();

    // 3. Verify children shown
    await expect(page.locator('[data-testid="category-node"]').first().locator('[data-testid="child-node"]').first()).toBeVisible();
  });

  test('should search categories', async ({ page }) => {
    // 1. Navigate to category guide
    await page.goto('/guides/categories');

    // 2. Enter search query
    await page.fill('[data-testid="category-search"]', 'одежда');

    // 3. Verify matching results shown
    const results = await page.locator('[data-testid="search-result"]').all();
    expect(results.length).toBeGreaterThan(0);
  });

  // ========== Category Detail ==========

  test('should display category detail page', async ({ page }) => {
    // 1. Navigate to category guide
    await page.goto('/guides/categories');

    // 2. Click on category
    await page.locator('[data-testid="category-node"]').first().click();

    // 3. Verify detail page loaded
    await expect(page).toHaveURL(/\/guides\/categories\/[a-z0-9]+/);
    await expect(page.locator('[data-testid="category-header"]')).toBeVisible();
  });

  test('should display category requirements', async ({ page }) => {
    // 1. Navigate to category detail
    await page.goto('/guides/categories/cloth-main');

    // 2. Verify requirements accordion
    await expect(page.locator('[data-testid="requirements-accordion"]')).toBeVisible();
    await expect(page.locator('[data-testid="requirement-item"]').first()).toBeVisible();
  });

  test('should display category tips', async ({ page }) => {
    // 1. Navigate to category detail
    await page.goto('/guides/categories/cloth-main');

    // 2. Verify tips section
    await expect(page.locator('[data-testid="tips-section"]')).toBeVisible();
  });

  test('should show breadcrumb navigation', async ({ page }) => {
    // 1. Navigate to subcategory
    await page.goto('/guides/categories/cloth-home');

    // 2. Verify breadcrumb
    await expect(page.locator('[data-testid="category-breadcrumb"]')).toBeVisible();
    await expect(page.locator('[data-testid="breadcrumb-link"]').first()).toContainText('Одежда');
  });

  // ========== Popular Categories ==========

  test('should display popular categories section', async ({ page }) => {
    // 1. Navigate to category guide
    await page.goto('/guides/categories');

    // 2. Verify popular categories
    await expect(page.locator('[data-testid="popular-categories"]')).toBeVisible();
    await expect(page.locator('[data-testid="popular-card"]').first()).toBeVisible();
  });
});
```

---

## Success Criteria

- [ ] Category tree is displayed and navigable
- [ ] Search works for finding categories
- [ ] Category detail shows requirements
- [ ] Category detail shows tips
- [ ] Breadcrumb navigation works
- [ ] Subcategories are shown
- [ ] Popular categories section exists
- [ ] All E2E tests pass
