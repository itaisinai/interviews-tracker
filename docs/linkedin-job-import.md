# LinkedIn Job Import

This feature imports the currently visible LinkedIn job page into Interviews Tracker through a Chrome extension and the authenticated backend API.

## Architecture

1. The Chrome extension runs only on LinkedIn job pages and extracts visible DOM text.
2. The popup posts the extracted payload to `POST /api/job-imports/linkedin`.
3. The authenticated backend route validates the payload.
4. `LinkedinJobImportService` checks duplicates, runs a LinkedIn-specific LLM normalization prompt, and calls the existing `createOpportunity` service.
5. The existing `parseJob` flow is unchanged.

## Run the Chrome extension locally

No build step is required for the minimal extension.

1. Start the API locally, normally on `http://localhost:4000`.
2. **Configure Auth0 (required for production, see Auth0 Setup below)**
3. Open Chrome and go to `chrome://extensions`.
4. Enable **Developer mode**.
5. Click **Load unpacked**.
6. Select `apps/linkedin-extension`.
7. **Note the extension ID** shown in the extension card (e.g., `abcdefghijklmnopqrstuvwxyz123456`)
8. Open a LinkedIn job page matching `https://www.linkedin.com/jobs/view/*` or a search page with `currentJobId`.
9. Click the extension icon.
10. Click **Sign in** and authenticate with Auth0.
11. Click **Import job**.

For local development, you can enable the API's dev auth mode instead of Auth0.

## Auth0 Setup

The extension requires Auth0 configuration for production use. You must configure the following in your Auth0 Application settings:

### Required Auth0 Application Settings

1. **Application Type**: Single Page Application (SPA) or Native

2. **Allowed Callback URLs**: Add the Chrome extension callback URL:
   - Load the extension in Chrome
   - Open the extension popup
   - Right-click → Inspect → Console tab
   - Copy the redirect URI shown in the console
   - Add that EXACT URL to Auth0 (typically `https://<extension-id>.chromiumapp.org/`)
   - **Do not guess the format** - use the exact value from the console

3. **Refresh Token Settings** (for automatic token refresh):
   - Enable "Refresh Token Rotation" (recommended)
   - Set "Refresh Token Expiration" (e.g., 30 days)
   - Ensure the API allows `offline_access` scope
   - Without refresh tokens, users must sign in again when access tokens expire (~1 hour)

4. **Token Endpoint Authentication Method**: None (PKCE flow doesn't use client secret)

### Extension Configuration

The extension is pre-configured with Auth0 settings in `src/auth.js`:

```javascript
domain: "dev-c1s005zh8spezp0e.us.auth0.com"
clientId: "hlI5kn4lePStXeHJohsGqyKnyoBHJtTW"
audience: "https://interviews-tracker-api.com"
scope: "openid profile email offline_access"
```

These values are **public** and safe to include in the extension (no secrets). For different environments or custom Auth0 tenants, update these values in `src/auth.js`.

### Finding Your Extension ID

1. Load the extension in Chrome (`chrome://extensions` → Load unpacked → select `apps/linkedin-extension`)
2. The extension ID appears below the extension name (e.g., `abcdefghijklmnopqrstuvwxyz123456`)
3. Add `chrome-extension://<EXTENSION_ID>/` to Auth0 Allowed Callback URLs
4. The extension uses `chrome.identity.getRedirectURL()` which always returns `chrome-extension://<EXTENSION_ID>/`

## Backend URL and host permissions

The popup uses `http://localhost:4000` by default. You can override it from Chrome extension storage under the `apiBaseUrl` key, for example with `chrome.storage.sync.set({ apiBaseUrl: "https://interviews-tracker-api.onrender.com" })` from the extension devtools context.

Changing `apiBaseUrl` is not enough by itself for production. Chrome also requires the API origin in `host_permissions`. The manifest currently includes:

- `http://localhost:4000/*`
- `https://interviews-tracker-api.onrender.com/*`

If deploying the API to a different host, add that origin to `apps/linkedin-extension/manifest.json` before packaging or loading the extension.

Because extension requests use a `chrome-extension://<extension-id>` origin, the API CORS allow-list must also include the installed extension origin in `CHROME_EXTENSION_ORIGIN` for production-like deployments.

## Auth behavior

The extension uses **Auth0 Authorization Code Flow with PKCE** for secure authentication. When the user clicks "Sign in", the extension:

1. Generates a cryptographically random code verifier and challenge
2. Launches Auth0's authorization page using `chrome.identity.launchWebAuthFlow`
3. User authenticates with Auth0
4. Auth0 redirects to `chrome-extension://<EXTENSION_ID>/` with an authorization code
5. Extension exchanges the code + verifier for an access token
6. Token is stored in `chrome.storage.local` and automatically included in API requests

The extension **does not bundle or hardcode any secrets**. PKCE allows public clients (like Chrome extensions) to authenticate securely without a client secret.

Tokens are automatically refreshed when they expire (if a refresh token was issued). Users can sign out at any time to clear stored credentials.

For local development, you can still manually paste a bearer token in Settings if needed.

## Required environment variables

The backend uses the existing API authentication configuration. LinkedIn import normalization requires:

```env
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-4o-mini # optional; defaults to the existing backend default
CHROME_EXTENSION_ORIGIN=chrome-extension://<installed-extension-id> # production extension CORS allow-list
```

## Known limitations

- LinkedIn DOM can change, so extraction uses selector fallbacks and may need maintenance.
- The user must be logged in to LinkedIn and viewing the job page.
- The extension only reads currently visible page content.
- This does not use LinkedIn's official API.
- Secrets must not be stored in the extension; bearer tokens are user-provided credentials and should be rotated if exposed.
- Duplicate detection uses `linkedinJobId` when present, otherwise the exact `sourceUrl`.

## Popup UI overview

The popup opens as a 360px "LinkedIn Job Importer" panel. On supported LinkedIn job pages it immediately asks the content script for visible job data and shows a **Detected job** preview with title, company, location, and LinkedIn job ID. Missing fields are shown with warnings, but import is only blocked when no useful job content is available.

Use **Preview extracted data** to toggle a compact scrollable JSON preview of the exact payload that will be sent to `POST /api/job-imports/linkedin`.

### Authentication

The popup shows the current authentication state:

- **Not signed in**: Click "Sign in" to authenticate with Auth0
- **Signed in ✓**: Shows your email address. Click "Sign out" to clear credentials.
- **Manual token ✓**: Using a manually-entered token from Settings (for dev/testing)

When signed in, the extension automatically includes your access token in all API requests. Tokens are refreshed automatically when they expire.

### Settings

Advanced configuration (click the gear icon):

- **API base URL**: defaults to `http://localhost:4000` and is saved in `chrome.storage.sync`.
- **Manual auth token**: Optional manual bearer token for dev/testing. OAuth tokens take precedence.

If the API returns `401` or `403`, the popup displays a clear authentication failure message.
