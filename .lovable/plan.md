

# Fix Plan: Local Testing File Sync + Add Preview Functionality

## Summary

Two issues were identified:
1. **Published posts don't appear** because the backend writes to `docs/` but you're viewing a static copy in `local-test/keebforge/`
2. **Preview button doesn't work** because it has no click handler implemented

---

## Issue 1: Published Posts Not Appearing

### Root Cause
When you run `Copy-Item` or `xcopy` to create `local-test/keebforge/`, it creates a **one-time snapshot**. The backend writes generated HTML to `docs/`, not to your copy.

### Solution Options

**Option A (Recommended): Serve directly from `docs/` with symlink**

Instead of copying files, create a folder structure using a junction/symlink so changes reflect immediately:

```text
local-test/
└── keebforge/  → points to ../docs/
```

**Option B: Re-copy after each publish**

After publishing, manually copy updated files:
```cmd
xcopy docs\posts local-test\keebforge\posts /E /Y
```

**Changes Required:**
- Update `LOCAL_TESTING.md` with clearer instructions using junctions/symlinks

---

## Issue 2: Preview Button Not Working

### Root Cause
The HTML has a Preview button (`#preview-btn`) but the JavaScript has no click handler for it.

### Solution
Add the missing event listener and preview function to `docs/admin/admin.js`:

**File: `docs/admin/admin.js`**

Add a new function around line 453:
```javascript
function previewPost() {
  const slug = $('#post-slug').value.trim();
  if (!slug) {
    showToast('Please enter a slug first', 'error');
    return;
  }
  // Open in new tab - works for both local and production
  const baseUrl = window.location.origin;
  const previewUrl = `${baseUrl}/keebforge/posts/${slug}/`;
  window.open(previewUrl, '_blank');
}
```

Add event listener in `initEventListeners()` around line 606:
```javascript
$('#preview-btn').addEventListener('click', previewPost);
```

---

## Updated Local Testing Instructions

**Using Windows Junction (Recommended):**

1. Open Command Prompt as Administrator
2. Navigate to project root
3. Create the junction:
   ```cmd
   mkdir local-test
   mklink /J local-test\keebforge docs
   ```
4. Serve from local-test:
   ```cmd
   cd local-test
   npx serve -p 8080
   ```

Now when you publish, the changes appear immediately because `local-test/keebforge` points directly to `docs/`.

---

## Technical Summary

| File | Change |
|------|--------|
| `docs/admin/admin.js` | Add `previewPost()` function and click handler for Preview button |
| `LOCAL_TESTING.md` | Update with junction-based setup for live file updates |

