# Local Testing Guide (Windows)

The site uses `/keebforge/` as the base path for GitHub Pages. For local testing, follow these steps:

## Prerequisites
- Node.js installed (download from https://nodejs.org)

## Setup (Using Directory Junction - Recommended)

This method keeps `local-test/keebforge` in sync with `docs/` so published changes appear immediately.

### Step 1: Create the Junction (One-time setup)

Open **Command Prompt as Administrator** and run:
```cmd
cd C:\path\to\your-project
mkdir local-test
mklink /J local-test\keebforge docs
```

You should see: `Junction created for local-test\keebforge <<===>> docs`

### Step 2: Start the Backend (Terminal 1)
```cmd
cd server
npm install
npm run setup    # First time only - sets admin password
npm start
```

### Step 3: Start the Frontend (Terminal 2)
```cmd
cd local-test
npx serve -p 8080
```

### Step 4: Access the Site
- Main site: http://localhost:8080/keebforge/
- Admin panel: http://localhost:8080/keebforge/admin/

Now when you publish posts via the admin panel, changes appear immediately!

---

## Alternative: Copy Files (No Admin Required)

If you can't create junctions, copy files manually:

```cmd
mkdir local-test\keebforge
xcopy docs local-test\keebforge /E /I
cd local-test
npx serve -p 8080
```

**Note:** With this method, you must re-copy after publishing:
```cmd
xcopy docs local-test\keebforge /E /Y
```

---

## Admin Panel Credentials

After running `npm run setup` in the server folder, you'll be prompted to create:
- Username (default: admin)
- Password (you choose)

---

## Cleanup

To remove the junction later:
```cmd
rmdir local-test\keebforge
rmdir local-test
```

---

## Troubleshooting

### "Cannot GET /api" error
Make sure both terminals are running:
- Terminal 1: Backend server on port 3001
- Terminal 2: Frontend serve on port 8080

### Styling not loading
Make sure you're accessing `/keebforge/` path, not just `/`

### CORS errors
The admin.js automatically detects localhost and uses the correct API URL.

### Published posts not appearing
If using the copy method (not junction), re-copy files after publishing:
```cmd
xcopy docs local-test\keebforge /E /Y
```
