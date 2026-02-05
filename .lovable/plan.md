

## Goal
Restructure the KeebForge site files so they can be deployed via GitHub Pages using the `/docs` folder option.

## The Problem
- GitHub Pages only allows deploying from `/` (root) or `/docs`
- Your site files are in `/public/keebforge/` which isn't selectable
- All internal links reference `/keebforge/` paths which won't work

## Solution

### Step 1: Create `/docs` folder structure
Move/copy all site content to a new `/docs` folder at the project root:
```
/docs/
  ├── index.html
  ├── css/styles.css
  ├── js/main.js, search.js, toc.js
  ├── assets/logo-icon.png
  ├── about/index.html
  ├── best/index.html
  ├── reviews/index.html
  ├── guides/index.html
  ├── deals/index.html
  ├── posts/*/index.html
  ├── resources/*/index.html
  ├── sitemap.xml
  ├── robots.txt
  └── rss.xml
```

### Step 2: Update all paths
Change all internal references from `/keebforge/` to `/keebforge/` (since your GitHub Pages URL is `mrshendoc.github.io/keebforge/`):

- All `href="/keebforge/..."` links stay the same
- CSS/JS references: `/keebforge/css/` → `/keebforge/css/`
- Asset paths: `/keebforge/assets/` → `/keebforge/assets/`

Actually, since your repo is named `keebforge` and GitHub Pages serves at `/keebforge/`, the paths should remain as-is. The files just need to be in `/docs`.

### Files to Create/Copy
- Copy all HTML files from `/public/keebforge/` to `/docs/`
- Copy CSS from `/public/css/styles.css` to `/docs/css/styles.css`
- Copy JS from `/public/js/*.js` to `/docs/js/`
- Copy assets to `/docs/assets/`

### After Implementation
1. Connect project to GitHub (if not already)
2. Go to GitHub repo Settings → Pages
3. Select `main` branch and `/docs` folder
4. Save and your site will be live at `https://mrshendoc.github.io/keebforge/`

