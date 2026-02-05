

# KeebForge UX/UI Enhancement Plan

## Overview

This plan addresses all identified issues and adds the requested features to create a superb, gaming-focused blog experience. The work covers bug fixes, UX improvements, scroll animations, theme toggle, and a custom 404 page.

---

## Issues Identified

### Critical Bugs

1. **Search not working** - The JS looks for `/keebforge/content/search-index.json` but there's no `content/` folder in `/docs/`
2. **Mobile menu has no background** - The hamburger menu opens but is transparent/overlays content without a solid background
3. **Social links go nowhere** - Twitter, YouTube, Discord links in footer use `href="#"` placeholder

### Missing Features

1. No scroll-triggered animations (elements just appear statically)
2. No light/dark theme toggle (only respects system preference)
3. No custom 404 page for broken links

---

## Implementation Plan

### Part 1: Fix Critical Bugs

#### 1.1 Create Content Folder in /docs

Create `docs/content/` directory and copy `search-index.json` from `public/content/`:
- Copy `public/content/search-index.json` to `docs/content/search-index.json`

#### 1.2 Fix Mobile Menu Background

Update `docs/css/styles.css` mobile navigation section (~line 1656-1703):

Current issue: The `.nav__list.open` has `background: var(--bg)` but needs stronger styling with proper z-index and opacity.

Changes:
- Add solid background with blur effect to match header glassmorphism
- Ensure proper layering with backdrop
- Add visible overlay when menu is open

#### 1.3 Remove/Fix Dead Social Links

Two options:
- **Option A**: Remove social links entirely from footer (cleaner)
- **Option B**: Keep icons but make them non-clickable with "Coming Soon" tooltip

Recommend **Option A** for now, removing the `.footer__social` div from `docs/index.html` and other pages.

---

### Part 2: Add Scroll Animations

#### 2.1 CSS Scroll Animations

Add new CSS animation classes to `docs/css/styles.css`:

```text
+--------------------------------+
|  Scroll Animation System       |
+--------------------------------+
| .scroll-reveal - base class    |
| .scroll-reveal--visible        |
| - Fade up on scroll            |
| - Staggered delays for grids   |
| - Scale in for tiles           |
+--------------------------------+
```

New keyframes:
- `@keyframes slideUp` - fade in from below
- `@keyframes scaleIn` - scale from 95% to 100%
- `.scroll-reveal` - invisible by default
- `.scroll-reveal--visible` - triggers animation

#### 2.2 JavaScript Intersection Observer

Update `docs/js/main.js` to add scroll reveal functionality:

```text
+----------------------------------+
|  initScrollReveal()              |
+----------------------------------+
| - IntersectionObserver API       |
| - Threshold: 0.1 (10% visible)   |
| - Adds .scroll-reveal--visible   |
| - Handles staggered delays       |
+----------------------------------+
```

#### 2.3 Apply to HTML Elements

Add `scroll-reveal` class to:
- Category tiles (`.category-tile`)
- Article cards (`.card`)
- Section headers (`.section__header`)
- Newsletter section (`.newsletter`)

---

### Part 3: Theme Toggle

#### 3.1 CSS Theme Variables

Update `docs/css/styles.css`:

- Change from `@media (prefers-color-scheme: light)` to class-based: `[data-theme="light"]`
- Add CSS for theme toggle button with sun/moon icons
- Smooth color transitions: `transition: background-color 0.3s, color 0.3s`

```text
+----------------------------------+
|  Theme System                    |
+----------------------------------+
| [data-theme="dark"] - default    |
| [data-theme="light"] - light     |
| Respects system on first load    |
| Saves preference to localStorage |
+----------------------------------+
```

#### 3.2 Theme Toggle Button

Add to header nav in `docs/index.html`:

```text
+----------------------+
| Theme Toggle Button  |
+----------------------+
| - Sun icon (light)   |
| - Moon icon (dark)   |
| - Animated rotation  |
| - Before search btn  |
+----------------------+
```

#### 3.3 JavaScript Theme Handler

Add to `docs/js/main.js`:

```text
initTheme()
+----------------------------------+
| 1. Check localStorage            |
| 2. Fallback to system preference |
| 3. Apply data-theme attribute    |
| 4. Toggle button click handler   |
| 5. Save preference on change     |
+----------------------------------+
```

---

### Part 4: Custom 404 Page

#### 4.1 Create docs/404.html

Design a gaming-themed 404 page:

```text
+------------------------------------------+
|              KEEBFORGE 404               |
+------------------------------------------+
|                                          |
|    [Animated keyboard icon glitching]    |
|                                          |
|           PAGE NOT FOUND                 |
|                                          |
|    Looks like you typed on the           |
|    wrong switch. Let's get you           |
|    back on track.                        |
|                                          |
|    [Return Home]  [Browse Reviews]       |
|                                          |
|    Popular destinations:                 |
|    - Best Keyboards                      |
|    - Beginner's Guide                    |
|    - Deals                               |
|                                          |
+------------------------------------------+
```

Features:
- Same header/footer as other pages
- Glitch animation on keyboard emoji
- Helpful navigation links
- Gaming-style "ERROR 404" text with gradient
- Matches dark theme aesthetic

#### 4.2 CSS for 404 Page

Add 404-specific styles to `docs/css/styles.css`:
- `.error-page` container
- `.error-code` large gradient text
- `.error-icon` animated keyboard
- Glitch animation keyframes

---

### Part 5: Update All Pages

The following changes need to be applied across all HTML files in `/docs/`:

1. Add `scroll-reveal` classes to appropriate elements
2. Add theme toggle button to header
3. Remove placeholder social links from footer
4. Ensure consistent header/footer markup

Files to update:
- `docs/index.html`
- `docs/about/index.html`
- `docs/best/index.html`
- `docs/reviews/index.html`
- `docs/guides/index.html`
- `docs/deals/index.html`
- `docs/contact/index.html`
- `docs/methodology/index.html`
- `docs/affiliate-disclosure/index.html`
- `docs/privacy/index.html`
- `docs/news/index.html`
- `docs/switches-keycaps/index.html`
- `docs/resources/index.html`
- `docs/resources/glossary/index.html`
- `docs/resources/sound-tests/index.html`
- `docs/resources/comparison-tables/index.html`
- `docs/resources/recommended-tools/index.html`
- All posts in `docs/posts/*/index.html`

---

## File Changes Summary

| File | Changes |
|------|---------|
| `docs/css/styles.css` | Mobile menu fix, scroll animations, theme system, 404 styles |
| `docs/js/main.js` | initScrollReveal(), initTheme() functions |
| `docs/content/search-index.json` | New file (copy from public/content/) |
| `docs/404.html` | New file - custom 404 page |
| `docs/index.html` | Theme toggle, scroll-reveal classes, remove dead social links |
| All other HTML files | Same header/footer updates |

---

## Technical Notes

### Intersection Observer for Scroll Animations
Uses native browser API for performance. No external library needed.

### Theme Persistence
- Uses `localStorage` key: `keebforge-theme`
- Values: `"dark"` or `"light"`
- Falls back to `prefers-color-scheme` media query on first visit

### GitHub Pages 404
GitHub Pages automatically serves `/docs/404.html` for non-existent routes when the site is deployed from `/docs`.

### Browser Compatibility
All features work in modern browsers (Chrome, Firefox, Safari, Edge - last 2 versions).

