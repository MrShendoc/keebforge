# Local Testing Guide (Windows)

The site uses `/keebforge/` as the base path for GitHub Pages. For local testing, follow these steps:

## Prerequisites
- Node.js installed (download from https://nodejs.org)

## Option 1: Serve from Parent Directory (Recommended)

1. **Create the folder structure**
   Open PowerShell in the project root and run:
   ```powershell
   # Create a temporary test folder
   mkdir local-test
   
   # Copy docs folder as keebforge subfolder
   Copy-Item -Recurse docs local-test/keebforge
   ```

2. **Start the backend (Terminal 1)**
   ```powershell
   cd server
   npm install
   npm run setup    # First time only - sets admin password
   npm start
   ```

3. **Start the frontend (Terminal 2)**
   ```powershell
   cd local-test
   npx serve -p 8080
   ```

4. **Access the site**
   - Main site: http://localhost:8080/keebforge/
   - Admin panel: http://localhost:8080/keebforge/admin/

## Option 2: Using mklink (Windows Symbolic Link)

1. **Open Command Prompt as Administrator**
   
2. **Create symbolic link**
   ```cmd
   cd docs
   mklink /D keebforge .
   ```
   This creates a `keebforge` folder that points to itself.

3. **Start servers as in Option 1**

4. **Access at** http://localhost:8080/keebforge/

## Admin Panel Credentials

After running `npm run setup` in the server folder, you'll be prompted to create:
- Username (default: admin)
- Password (you choose)

## Troubleshooting

### "Cannot GET /api" error
Make sure both terminals are running:
- Terminal 1: Backend server on port 3001
- Terminal 2: Frontend serve on port 8080

### Styling not loading
Make sure you're accessing `/keebforge/` path, not just `/`

### CORS errors
The admin.js automatically detects localhost and uses the correct API URL.
