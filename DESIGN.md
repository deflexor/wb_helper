# Design System - WBHelper Dashboard

## 1. Visual Theme & Atmosphere

A high-performance dashboard cockpit with neon volt accents on obsidian black. The dark canvas creates focus; the yellow-green accent (#faff69) guides attention like runway lights on a dark runway.

**Key Characteristics:**
- Pure black canvas (#000000) with neon yellow-green (#faff69) accent — maximum contrast
- Heavy display typography: Inter at weight 700-900
- Dark charcoal card system with rgba(65,65,65,0.8) borders
- Forest green (#166534) secondary CTA buttons
- Uppercase labels with letter-spacing for navigation structure
- Active/pressed state shifts text to pale yellow (#f4f692)
- All links hover to neon yellow-green — unified interactive signal
- Subtle inset shadows for "pressed into surface" depth

## 2. Color Palette & Roles

### Primary
- **Neon Volt** (`#faff69`): Primary accent — CTAs, borders, highlights
- **Forest Green** (`#166534`): Secondary CTA — "Get Started" buttons
- **Dark Forest** (`#14572f`): Darker green variant for borders

### Secondary & Accent
- **Pale Yellow** (`#f4f692`): Active/pressed state text
- **Border Olive** (`#4f5100`): Ghost button borders
- **Olive Dark** (`#161600`): Subtle brand text

### Surface & Background
- **Pure Black** (`#000000`): Primary page background
- **Near Black** (`#141414`): Button backgrounds, elevated surfaces
- **Charcoal** (`#414141`): Primary border color at 80% opacity
- **Deep Charcoal** (`#343434`): Subtle division lines
- **Hover Gray** (`#3a3a3a`): Button hover state

### Neutrals & Text
- **Pure White** (`#ffffff`): Primary text
- **Silver** (`#a0a0a0`): Secondary body text, muted content
- **Mid Gray** (`#585858` at 28%): Subtle overlays

## 3. Typography Rules

### Font Family
- **Primary**: Inter (weights: 400, 500, 600, 700, 900)
- **Fallback**: system-ui, -apple-system, sans-serif

### Hierarchy

| Role | Size | Weight | Letter Spacing | Notes |
|------|------|--------|----------------|-------|
| Display | 48-72px | 700-900 | normal | Hero titles |
| H1 | 36px | 700 | normal | Section headers |
| H2 | 24px | 600 | normal | Card headings |
| H3 | 20px | 600 | normal | Feature titles |
| Body | 16px | 400-500 | normal | Standard text |
| Caption | 14px | 400-500 | normal | Metadata |
| Label | 14px | 600 | 1.4px | Uppercase labels |
| Small | 12px | 500 | normal | Tags, tiny labels |

### Principles
- **Weight creates hierarchy**: 900 for hero, 700 for h1, 600 for h2-h3, 400-500 for body
- **Uppercase with tracking**: Section overlines use 1.4px letter-spacing
- **Readable in darkness**: High contrast, adequate line heights

## 4. Component Stylings

### Buttons

**Neon Primary**
- Background: `#faff69`, Text: `#151515`
- Border: `1px solid #faff69`
- Hover: background shifts to `#3a3a3a`, text stays neon
- Active: text shifts to `#f4f692`

**Dark Solid**
- Background: `#141414`, Text: `#ffffff`
- Border: `1px solid rgba(65,65,65,0.8)`
- Hover: bg `#3a3a3a`
- Active: text to `#f4f692`

**Forest Green**
- Background: `#166534`, Text: `#ffffff`
- Border: `1px solid #141414`
- Hover: bg darkens
- Active: text to `#f4f692`

**Ghost / Outlined**
- Background: transparent
- Text: `#ffffff`
- Border: `1px solid rgba(65,65,65,0.8)`
- Hover: dark bg shift

### Cards & Containers
- Background: transparent or `#141414`
- Border: `1px solid rgba(65,65,65,0.8)`
- Radius: 8px (cards), 4px (small elements)
- Shadow Level 1: `0px 1px 3px rgba(0,0,0,0.1)`
- Shadow Level 2 (Elevated): `0px 10px 15px -3px rgba(0,0,0,0.1)`
- Inset (Pressed): `inset 0px 4px 4px rgba(0,0,0,0.14)`
- Neon Highlight: `1px solid #faff69` border

### Navigation
- Dark nav on black background
- Logo: WBHelper icon with neon accent
- Links: white text, hover to Neon Volt
- CTA: Neon Volt button or Forest Green button

### Distinctive Components

**Data Tables**
- Dark surface with subtle borders
- Header: uppercase labels, 1.4px tracking
- Rows: hover state with subtle bg shift
- Zebra: alternating row backgrounds at low opacity

**Badges**
- Pill shape (9999px radius)
- Small text, uppercase
- Color-coded: green (success), yellow (warning), red (danger), gray (neutral)

**Form Elements**
- Dark input backgrounds (#141414)
- Subtle borders that highlight on focus
- Focus ring: neon accent

## 5. Layout Principles

### Spacing System (8px base)
- 2px, 4px, 8px, 12px, 16px, 20px, 24px, 32px, 40px, 48px, 64px

### Container
- Max width: 1400px (dashboard context)
- Padding: 16px mobile, 24px tablet, 32px desktop

### Sidebar
- Width: 280px expanded, 72px collapsed
- Dark surface (#0a0a0a slightly lighter than black)
- Collapsible on mobile

### Grid System
- 12-column grid for dashboards
- Responsive: 4 → 8 → 12 columns

## 6. Depth & Elevation

| Level | Treatment |
|-------|-----------|
| Flat | No shadow — black background |
| Bordered | `1px solid rgba(65,65,65,0.8)` — standard cards |
| Subtle | `0px 1px 3px rgba(0,0,0,0.1)` — slight lift |
| Elevated | `0px 10px 15px -3px rgba(0,0,0,0.1)` — feature cards |
| Pressed | Inset shadow — active elements |
| Neon | `#faff69` border — featured/selected |

## 7. Responsive Behavior

### Breakpoints
| Name | Width |
|------|-------|
| Mobile | <640px |
| Tablet | 640-1024px |
| Desktop | 1024-1280px |
| Wide | >1280px |

### Collapsing Strategy
- Sidebar: full → icon-only → hidden (drawer)
- Cards: multi-column → 2 → 1
- Tables: horizontal scroll or card view

## 8. Animation Principles

- **Duration**: 150ms for micro, 300ms for transitions
- **Easing**: ease-out for enters, ease-in for exits
- **Sidebar collapse**: 200ms with transform
- **Hover states**: 150ms color/shadow transitions
- **Page transitions**: 300ms fade with slight y-translate
- **Loading states**: subtle pulse animation

## 9. Accessibility

- All interactive elements keyboard accessible
- Focus states visible with neon ring
- Sufficient color contrast (4.5:1 minimum)
- ARIA labels for icon-only buttons
- Reduced motion support via prefers-reduced-motion