

# Self-Hosted Admin Panel for KeebForge

## Overview

This plan creates a **fully self-contained admin system** that works on any cloud hosting or VPS without external dependencies. The admin panel will be a single-page application with its own lightweight backend API.

---

## Architecture

```text
+--------------------------------------------------+
|                   FRONTEND                       |
|  docs/admin/index.html (Password-protected SPA)  |
|  - Login screen with username/password           |
|  - Dashboard with post/category management       |
|  - Rich text editor for post content             |
|  - Preview before publishing                     |
+--------------------------------------------------+
                       |
                       v
+--------------------------------------------------+
|                   BACKEND API                    |
|       (Node.js Express - runs on VPS/Cloud)      |
|  - Authentication (bcrypt hashed passwords)      |
|  - CRUD for posts (JSON file storage)            |
|  - CRUD for categories                           |
|  - Static file regeneration                      |
+--------------------------------------------------+
                       |
                       v
+--------------------------------------------------+
|                  DATA STORAGE                    |
|          (JSON files + HTML generation)          |
|  - docs/content/posts.json                       |
|  - docs/content/categories.json                  |
|  - docs/posts/[slug]/index.html (generated)      |
+--------------------------------------------------+
```

---

## Files to Create

### Admin Frontend (Static HTML/CSS/JS)
| File | Purpose |
|------|---------|
| `docs/admin/index.html` | Admin SPA with login + dashboard |
| `docs/admin/admin.css` | Admin-specific styling (dark theme) |
| `docs/admin/admin.js` | Admin logic (auth, CRUD, API calls) |

### Backend Server (Node.js)
| File | Purpose |
|------|---------|
| `server/package.json` | Dependencies (express, bcrypt, fs-extra) |
| `server/index.js` | Express server with API routes |
| `server/auth.js` | Authentication middleware |
| `server/config.json` | Hashed admin credentials |
| `server/templates/post.html` | HTML template for generating posts |

---

## Features

### Authentication
- **Username/Password login** with bcrypt-hashed credentials
- Session-based authentication with secure HTTP-only cookies
- Auto-logout after inactivity
- Credentials stored in `server/config.json` (you set on first run)

### Post Management
- **Create new posts** with title, slug, category, excerpt, content
- **Rich text editing** using a lightweight Markdown editor
- **Edit existing posts** - loads from JSON, saves to JSON + regenerates HTML
- **Delete posts** - removes from JSON + deletes HTML file
- **Preview posts** before publishing

### Category Management
- **Create categories** with name, slug, description, color
- **Edit categories** - update metadata
- **Delete categories** (with warning if posts exist)
- **Manage subcategories** for each parent category

### Content Generation
When you save a post, the backend:
1. Updates `docs/content/posts.json`
2. Updates `docs/content/search-index.json`
3. Generates/updates `docs/posts/[slug]/index.html` from template
4. Updates category listing pages

---

## Admin UI Design

### Login Screen
```text
+----------------------------------------+
|           KEEBFORGE ADMIN              |
|                                        |
|   [    Username field    ]             |
|   [    Password field    ]             |
|                                        |
|   [        Login         ]             |
+----------------------------------------+
```

### Dashboard
```text
+--------------------------------------------------+
| KEEBFORGE ADMIN          [Theme Toggle] [Logout] |
+--------------------------------------------------+
| [+ New Post]  [+ New Category]                   |
+--------------------------------------------------+
| POSTS                           | QUICK STATS    |
| +---------+-----------+------+  | Posts: 12      |
| | Title   | Category  | Edit |  | Categories: 5  |
| +---------+-----------+------+  | Published: 12  |
| | Best... | Best Of   | [E]  |  | Drafts: 0      |
| | Keych...| Reviews   | [E]  |  +----------------+
| | Begin...| Guides    | [E]  |                   |
| +---------+-----------+------+                   |
+--------------------------------------------------+
```

### Post Editor
```text
+--------------------------------------------------+
| [< Back]       Edit Post           [Save] [Delete]|
+--------------------------------------------------+
| Title:     [Best Mechanical Keyboards Under $100]|
| Slug:      [best-mechanical-keyboards-under-100] |
| Category:  [Dropdown: Best Of v]                 |
| Excerpt:   [Looking for a quality keyboard...]   |
+--------------------------------------------------+
| Content (Markdown):                              |
| +----------------------------------------------+ |
| | # Introduction                               | |
| |                                              | |
| | Looking for a quality mechanical keyboard...  | |
| |                                              | |
| +----------------------------------------------+ |
+--------------------------------------------------+
| Key Takeaways:                                   |
| [+] Hot-swappable boards let you customize...    |
| [+] Add new takeaway                             |
+--------------------------------------------------+
| FAQ:                                             |
| Q: Is a mechanical keyboard worth it under $100? |
| A: Absolutely. Many sub-$100 mechanical...       |
| [+ Add FAQ]                                      |
+--------------------------------------------------+
```

---

## Deployment Instructions

### For VPS/Cloud Hosting:

1. **Install Node.js** on your server (v18+)

2. **Clone/upload the repository** to your server

3. **Set up the backend**:
   ```bash
   cd server
   npm install
   npm run setup  # Creates admin credentials
   npm start      # Runs on port 3001
   ```

4. **Configure nginx** to:
   - Serve `/docs` as static files on port 80/443
   - Proxy `/api/*` to Node.js on port 3001

5. **Set your admin password** on first run

### Sample nginx config:
```text
server {
    listen 80;
    server_name yourdomain.com;
    
    # Serve static files
    location / {
        root /path/to/docs;
        index index.html;
    }
    
    # Proxy API to Node.js
    location /api {
        proxy_pass http://localhost:3001;
    }
}
```

---

## Security Features

1. **Password hashing** - bcrypt with salt rounds
2. **HTTP-only cookies** - prevents XSS token theft
3. **CSRF protection** - tokens on state-changing requests
4. **Rate limiting** - prevents brute force attacks
5. **Input sanitization** - prevents injection attacks
6. **Admin-only access** - no public registration

---

## Technical Details

### Backend API Endpoints:
```text
POST   /api/auth/login      - Authenticate user
POST   /api/auth/logout     - Clear session
GET    /api/auth/check      - Verify session is valid

GET    /api/posts           - List all posts
GET    /api/posts/:slug     - Get single post
POST   /api/posts           - Create new post
PUT    /api/posts/:slug     - Update post
DELETE /api/posts/:slug     - Delete post

GET    /api/categories      - List all categories
POST   /api/categories      - Create category
PUT    /api/categories/:id  - Update category
DELETE /api/categories/:id  - Delete category
```

### Data Flow for Creating a Post:
1. Admin fills out form in browser
2. JavaScript POSTs to `/api/posts`
3. Server validates + authenticates
4. Server updates `posts.json`
5. Server regenerates `search-index.json`
6. Server creates `docs/posts/[slug]/index.html`
7. Returns success to browser

---

## Files Summary

| Location | File | Purpose |
|----------|------|---------|
| `docs/admin/` | `index.html` | Admin SPA |
| `docs/admin/` | `admin.css` | Admin styles |
| `docs/admin/` | `admin.js` | Admin logic |
| `docs/content/` | `posts.json` | Post data (expanded from search-index) |
| `docs/content/` | `categories.json` | Category data |
| `server/` | `package.json` | Node.js dependencies |
| `server/` | `index.js` | Express API server |
| `server/` | `auth.js` | Auth middleware |
| `server/` | `config.json` | Admin credentials (hashed) |
| `server/templates/` | `post.html` | Post page template |
| `server/` | `generate.js` | Static HTML generator |

---

## Why This Approach?

- **No external dependencies** - runs entirely on your VPS
- **Portable** - copy the folder to any server with Node.js
- **Simple** - no database to manage, just JSON files
- **Familiar** - Express.js is widely understood
- **Secure** - proper auth, hashing, and protections
- **Maintainable** - clear separation of frontend/backend

