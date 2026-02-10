

# Admin Panel Upgrade: WYSIWYG Editor, Image Management, and More

## Overview

Four major improvements to the KeebForge admin panel, all implemented within the existing vanilla HTML/CSS/JS architecture and Node.js backend. No framework changes needed.

## 1. WYSIWYG Editor (TinyMCE)

Replace the plain Markdown textarea with TinyMCE -- the same editor engine WordPress uses. It provides a familiar toolbar with formatting, headings, links, tables, and image insertion.

**Why TinyMCE over alternatives:**
- WordPress-level editing experience (the user's explicit request)
- Free community edition, loaded via CDN -- no npm dependency needed
- Outputs clean HTML directly, which simplifies the pipeline (no Markdown-to-HTML conversion needed for new posts)
- Built-in image upload integration

**Content pipeline change:**
- Currently: content stored as Markdown in posts.json, converted to HTML by `marked` during generation
- New approach: content stored as HTML directly (TinyMCE outputs HTML natively)
- The `generatePostHtml` function will be updated to skip the `markdownToHtml` step and inject the HTML content directly (still sanitized)
- Existing Markdown posts will continue to work -- the generator will detect and convert Markdown only when needed

**Changes:**
- `docs/admin/index.html` -- add TinyMCE CDN script, replace the content textarea with a TinyMCE init target
- `docs/admin/admin.js` -- initialize TinyMCE on the content field, update `collectFormData()` to pull content from TinyMCE, update form reset/populate logic
- `server/generate.js` -- update `generatePostHtml` to handle both HTML and Markdown content (check if content contains HTML tags; if so, sanitize directly instead of running through `marked`)

## 2. Image Management

Add the ability to upload images from the admin panel and insert them into posts.

**Backend:**
- New API route: `POST /api/upload` -- accepts multipart file uploads, saves to `docs/assets/uploads/` directory
- New API route: `GET /api/images` -- lists all uploaded images
- New API route: `DELETE /api/images/:filename` -- removes an uploaded image
- Add `multer` npm dependency for file upload handling
- Images served statically at `/keebforge/assets/uploads/`

**Frontend:**
- New "Image Library" modal accessible from the editor toolbar and as a standalone button
- Shows a grid of uploaded images with filename, size, and copy-URL button
- Upload area with drag-and-drop support
- TinyMCE integration: clicking an image in the library inserts it at the cursor position
- Delete button for removing unused images

**Changes:**
- `server/package.json` -- add `multer` dependency
- `server/index.js` -- add upload routes and static file serving for uploads directory
- `docs/admin/index.html` -- add Image Library modal HTML
- `docs/admin/admin.js` -- add image upload/browse/delete functions, TinyMCE image picker integration
- `docs/admin/admin.css` -- styles for image grid, upload area, modal

## 3. Word Count and Auto Read-Time

Display a live word count below the editor and automatically calculate the estimated read time.

**Logic:**
- Count words from TinyMCE's text content (stripped of HTML tags)
- Calculate read time using ~200 words per minute (industry standard for technical content)
- Update in real-time as the user types
- Auto-populate the "Read Time" field (user can still override manually)

**Changes:**
- `docs/admin/index.html` -- add a stats bar below the editor (word count, character count, estimated read time)
- `docs/admin/admin.js` -- add word count listener on TinyMCE content changes, auto-fill read time field
- `docs/admin/admin.css` -- styles for the editor stats bar

## 4. Post Scheduling and Ordering

Add publish date control and sorting to the posts management.

**Data changes:**
- Add `publishDate` field to post objects in `posts.json`
- Add `sortOrder` field for manual ordering within categories

**Dashboard improvements:**
- Add "Publish Date" column to the posts table
- Add sortable column headers (click to sort by title, date, status, category)
- Add a date picker field in the post editor for scheduling
- Posts with a future `publishDate` get a "scheduled" status badge
- "Regenerate All" will skip posts with future publish dates

**Changes:**
- `docs/admin/index.html` -- add publish date input to editor form, add sort controls to table headers
- `docs/admin/admin.js` -- add date handling, sorting logic, scheduled status support
- `docs/admin/admin.css` -- styles for date picker, scheduled badge, sort indicators
- `server/index.js` -- handle `publishDate` field in create/update routes
- `server/generate.js` -- skip generating HTML for future-dated posts

## File Change Summary

| File | Changes |
|------|---------|
| `docs/admin/index.html` | Add TinyMCE CDN, image library modal, editor stats bar, publish date field, sort controls |
| `docs/admin/admin.js` | TinyMCE init, image upload/browse, word count, date handling, sorting, form data updates |
| `docs/admin/admin.css` | Image grid, upload area, stats bar, date picker, scheduled badge, sort indicators |
| `server/index.js` | Image upload/list/delete API routes, publishDate handling |
| `server/generate.js` | Support HTML content (skip markdown conversion), skip future-dated posts |
| `server/package.json` | Add `multer` dependency |

## Implementation Order

1. TinyMCE editor integration (biggest impact on editing experience)
2. Word count and auto read-time (quick win, builds on TinyMCE)
3. Image management (backend routes + frontend modal)
4. Post scheduling and ordering (data model + UI enhancements)

## Important Notes

- TinyMCE is loaded via CDN (no API key needed for the open-source core)
- Existing Markdown content in posts.json will still render correctly -- the generator detects content type automatically
- Image uploads are stored on disk alongside the static site files, so they deploy with the rest of the site
- After pulling these changes, you will need to run `cd server && npm install` to get the new `multer` dependency

