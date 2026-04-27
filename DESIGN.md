# Design System - WBHelper Dashboard

## 1. Visual Theme & Atmosphere

A high-performance dashboard cockpit with dual-theme support: **light mode (default)** and **dark mode (user-selectable)**. Both themes use neon volt accents (#faff69) for interactive elements, creating a consistent brand identity regardless of the chosen palette.

**Design Influences:** Vercel (precision engineering, clean black/white surfaces) and Linear (ultra-minimal, functional aesthetics).

**Key Characteristics:**
- **Light Theme (Default):** Clean white canvas (#ffffff) with obsidian accents — minimal, functional, high contrast
- **Dark Theme (User-Selectable):** Pure black canvas (#000000) with neon volt highlights — maximum drama and focus
- Heavy display typography: Inter at weight 700-900
- Neon Yellow-Green (#faff69) as the unified interactive signal across both themes
- Forest Green (#166534) for secondary CTAs
- Theme toggle in TopBar: Sun icon (light) / Moon icon (dark)
- User preference persisted to localStorage

**Theme Architecture:**
- CSS custom properties (variables) for all colors
- `.dark` class on `<html>` element activates dark theme
- Smooth 200ms transition between themes
- System preference detection (`prefers-color-scheme`) as fallback

## 2. Color Palette & Roles

Both themes share the same CSS variable naming convention, with values swapped via `.dark` class.

### Light Theme (DEFAULT)

```css
:root {
  /* Core surfaces */
  --background: #ffffff;
  --foreground: #151515;
  
  /* Primary accent — neon volt */
  --primary: #faff69;
  --primary-foreground: #151515;
  
  /* Secondary — forest green */
  --secondary: #166534;
  --secondary-foreground: #ffffff;
  
  /* Muted elements */
  --muted: #f4f4f5;
  --muted-foreground: #737373;
  
  /* Accent (same as primary for consistency) */
  --accent: #faff69;
  --accent-foreground: #151515;
  
  /* Borders & cards */
  --border: #e5e5e5;
  --card: #ffffff;
  --card-foreground: #151515;
  
  /* Chart colors (light) */
  --chart-grid: #e5e5e5;
  --chart-text: #737373;
  --chart-tooltip-bg: #ffffff;
  
  /* Destructive */
  --destructive: #dc2626;
  --destructive-foreground: #ffffff;
}
```

### Dark Theme (USER-SELECTABLE)

```css
.dark {
  /* Core surfaces */
  --background: #000000;
  --foreground: #ffffff;
  
  /* Primary accent — neon volt */
  --primary: #faff69;
  --primary-foreground: #000000;
  
  /* Secondary — forest green */
  --secondary: #166534;
  --secondary-foreground: #ffffff;
  
  /* Muted elements */
  --muted: #404040;
  --muted-foreground: #a0a0a0;
  
  /* Accent (same as primary for consistency) */
  --accent: #faff69;
  --accent-foreground: #000000;
  
  /* Borders & cards */
  --border: rgba(65, 65, 65, 0.8);
  --card: #000000;
  --card-foreground: #ffffff;
  
  /* Chart colors (dark) */
  --chart-grid: rgba(65, 65, 65, 0.3);
  --chart-text: #a0a0a0;
  --chart-tooltip-bg: #0a0a0a;
  
  /* Destructive */
  --destructive: #dc2626;
  --destructive-foreground: #ffffff;
}
```

### Color Role Summary

| Role | Light Theme | Dark Theme |
|------|-------------|-------------|
| Background | `#ffffff` | `#000000` |
| Foreground | `#151515` | `#ffffff` |
| Primary/Accent | `#faff69` | `#faff69` |
| Secondary | `#166534` | `#166534` |
| Muted | `#f4f4f5` | `#404040` |
| Muted Text | `#737373` | `#a0a0a0` |
| Border | `#e5e5e5` | `rgba(65,65,65,0.8)` |
| Card | `#ffffff` | `#000000` |

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

### Semantic Color Usage

**CRITICAL: Use semantic CSS variables for all colors to support both themes.**

| Hardcoded (AVOID) | Semantic (USE) | Purpose |
|-------------------|----------------|---------|
| `bg-[#141414]` | `bg-card` | Card backgrounds |
| `bg-[#0a0a0a]` | `bg-muted` | Input backgrounds |
| `bg-black/40` | `bg-muted` | Semi-transparent overlays |
| `text-white` | `text-foreground` | Primary text |
| `text-gray-400` | `text-muted-foreground` | Secondary text |
| `border-[rgba(65,65,65,0.8)]` | `border-border` | Borders |

### Buttons

**Neon Primary**
- Background: `bg-primary` (adapts per theme)
- Text: `text-primary-foreground`
- Hover: `hover:bg-primary/90`
- Active: neon volt stays, text remains dark

**Dark Solid** (for dark mode)
- Background: `dark:bg-[#141414]`
- Text: `dark:text-white`
- Border: `dark:border-charcoal`

**Forest Green**
- Background: `bg-secondary`
- Text: `text-secondary-foreground`
- Works in both themes

**Ghost / Outlined**
- Background: transparent
- Border: `border-border`
- Hover: `hover:bg-muted`

### Cards & Containers
- Background: `bg-card` (white in light, black in dark)
- Border: `border-border` (subtle gray in light, charcoal in dark)
- Light theme: `shadow-sm` for subtle elevation
- Dark theme: `dark:shadow-none` (relies on border)
- Radius: 8px (cards), 4px (small elements)

### Navigation (Sidebar)
- Light theme: `bg-slate-50` background, `text-foreground` for links
- Dark theme: `dark:bg-[#0a0a0a]`, `dark:text-white`
- Active state: `bg-primary/10` with `text-foreground` (light), `dark:bg-white/5` with `dark:text-white` (dark)
- Use `text-primary` ONLY for small accent elements (icons, borders)
- Logo: `text-primary` (neon volt - brand accent)

### Distinctive Components

**Data Tables**
- Light: white background with subtle borders
- Dark: dark background with charcoal borders
- Header: uppercase labels, 1.4px tracking
- Rows: hover state with `hover:bg-muted`

**Badges**
- Pill shape (9999px radius)
- Small text, uppercase
- Color-coded: green (success), yellow (warning), red (danger), gray (neutral)
- Use semantic color classes: `bg-green-500/20 text-green-400`

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

### Light Theme Shadow Scale (Elevation)
The light theme uses a clean shadow hierarchy for elevation:

| Level | Name | Shadow | Use Case |
|-------|------|--------|----------|
| 1 | `shadow-sm` | `0 1px 2px 0 rgba(0,0,0,0.05)` | Subtle lift, inactive elements |
| 2 | `shadow-md` | `0 4px 6px -1px rgba(0,0,0,0.1)` | Elevated cards, floating elements |
| 3 | `shadow-lg` | `0 10px 15px -3px rgba(0,0,0,0.1)` | Modals, dropdowns, popovers |

### Dark Theme Treatment
Dark theme relies primarily on border contrast and background elevation rather than shadows, maintaining a flat, minimal aesthetic.

### Depth Summary

| Level | Treatment |
|-------|-----------|
| Flat | No shadow — default dark background |
| Bordered | `1px solid var(--border)` — standard cards |
| Subtle | `shadow-sm` — slight lift |
| Elevated | `shadow-md` — feature cards |
| Popover | `shadow-lg` — modals, dropdowns |
| Neon | `1px solid var(--primary)` border — featured/selected |

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

## 10. Theme System

### Overview
The dashboard supports a **light theme (default)** and a **dark theme (user-selectable)** via a theme toggle in the TopBar. Theme preference is persisted to localStorage.

### Design Influences
- **Vercel**: Precision engineering, clean black/white surfaces, functional minimalism
- **Linear**: Ultra-minimal aesthetic, crisp typography, subtle depth through borders

### Implementation
- All colors defined as CSS custom properties (variables)
- `.dark` class on `<html>` element activates dark theme
- Smooth 200ms transition when switching themes
- System preference detection (`prefers-color-scheme`) as initial fallback

### Theme Toggle Component
- **Position**: TopBar (header)
- **Icons**: Sun (light mode) / Moon (dark mode)
- **Behavior**: Click toggles between themes, icon updates immediately

### Sidebar Styling by Theme

| Aspect | Light Theme | Dark Theme |
|--------|-------------|-------------|
| Background | `#f4f4f5` (muted) | `#0a0a0a` (near black) |
| Text | `#151515` (foreground) | `#ffffff` (foreground) |
| Active Item | `var(--primary)` accent border | `var(--primary)` accent border |
| Hover State | `var(--muted)` background | `rgba(255,255,255,0.05)` overlay |
| Border | `#e5e5e5` | `rgba(65,65,65,0.8)` |

### Chart Color Palette

| Element | Light Theme | Dark Theme |
|---------|-------------|-------------|
| Grid Lines | `#e5e5e5` | `rgba(65,65,65,0.3)` |
| Axis Text | `#737373` | `#a0a0a0` |
| Tooltip Background | `#ffffff` | `#0a0a0a` |

Charts use the primary `--primary` variable for data series, with grid and text colors adapting to the active theme for optimal legibility.

### Component Adaptation

All components use CSS variables for theming, ensuring consistent appearance across themes:

```css
/* Example: Card component adapts to both themes */
.card {
  background: var(--card);
  color: var(--card-foreground);
  border: 1px solid var(--border);
  box-shadow: shadow-sm; /* Light theme elevation */
}

.dark .card {
  /* Dark theme: flatter appearance, borders instead of shadows */
  box-shadow: none;
}
```