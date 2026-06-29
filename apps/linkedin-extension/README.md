# LinkedIn Job Importer - Chrome Extension

Import LinkedIn jobs directly into Interviews Tracker with one click.

## Quick Start

1. **Load the extension**:
   - Open Chrome and go to `chrome://extensions`
   - Enable "Developer mode" (toggle in top-right)
   - Click "Load unpacked"
   - Select this directory (`apps/linkedin-extension`)

2. **Configure Auth0** (required for production):
   - Open the extension popup
   - Open Chrome DevTools console (right-click popup → Inspect)
   - Copy the exact "Redirect URI" shown in the console
   - In Auth0 Application settings, add that URL to **Allowed Callback URLs**
   - **Important**: Use the EXACT URL from the console (Chrome generates this URL automatically)

3. **Use the extension**:
   - Open any LinkedIn job page (`https://www.linkedin.com/jobs/view/*`)
   - Click the extension icon
   - Click "Sign in" and authenticate with Auth0
   - Click "Import job"

## Authentication

The extension uses **Auth0 Authorization Code Flow with PKCE** for secure authentication. No client secrets are stored in the extension.

### Current Configuration

The extension is pre-configured for production:

- **Auth0 Domain**: `dev-c1s005zh8spezp0e.us.auth0.com`
- **Client ID**: `hlI5kn4lePStXeHJohsGqyKnyoBHJtTW`
- **Audience**: `https://interviews-tracker-api.com`

These values are **public** and safe to include (PKCE flow has no secrets).

### Local Development

For local development with the API running on `http://localhost:4000`:

1. Either: Enable dev auth mode in the API
2. Or: Click the gear icon → Settings → paste a valid Auth0 token manually

## Files

- `manifest.json` - Extension configuration and permissions
- `src/popup.html` - Popup UI
- `src/popup.js` - Main popup logic
- `src/auth.js` - Auth0 PKCE authentication flow
- `src/content.js` - Content script that runs on LinkedIn pages
- `src/extractor.js` - Job data extraction logic
- `src/popup-utils.js` - Utility functions

## Permissions

- `identity` - Required for Auth0 web authentication flow
- `activeTab` - Access the current LinkedIn tab
- `scripting` - Inject content scripts
- `storage` - Store auth tokens and settings

## How It Works

1. **Detection**: Content script extracts visible job data from the LinkedIn DOM
2. **Authentication**: User signs in with Auth0 (PKCE flow)
3. **Import**: Extension posts job data to `POST /api/job-imports/linkedin`
4. **Backend**: API validates token, normalizes data, creates opportunity

## Troubleshooting

### "Authentication failed"

- Make sure your extension ID is added to Auth0 Allowed Callback URLs
- Try signing out and signing in again
- Check that the Auth0 application is configured correctly

### "Import failed (401)"

- Your token may have expired - sign out and sign in again
- Make sure the API is running and accessible
- Check that `AUTH0_DOMAIN` and `AUTH0_AUDIENCE` match in the API

### "No useful job content detected"

- Make sure you're on a LinkedIn job page (`/jobs/view/*`)
- Scroll down to ensure the job description is loaded
- Refresh the page and try again

## Building for Production

No build step is required - the extension runs directly from source files.

To package for distribution:

```bash
cd apps/linkedin-extension
zip -r linkedin-importer.zip . -x "*.DS_Store" -x "test/*" -x "fixtures/*"
```

Upload `linkedin-importer.zip` to the Chrome Web Store.

## Security Notes

- Extension uses PKCE (Proof Key for Code Exchange) - no client secret needed
- Access tokens stored in `chrome.storage.local` (encrypted by Chrome)
- Tokens are scoped to the API audience
- Tokens auto-refresh when expired
- No credentials are sent to third parties

## More Documentation

See `../../docs/linkedin-job-import.md` for complete documentation.
