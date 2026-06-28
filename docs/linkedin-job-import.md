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
2. For local development, either enable the API's documented dev auth mode or paste a valid Auth0 API access token into the extension popup.
3. Open Chrome and go to `chrome://extensions`.
4. Enable **Developer mode**.
5. Click **Load unpacked**.
6. Select `apps/linkedin-extension`.
7. Open a LinkedIn job page matching `https://www.linkedin.com/jobs/view/*` or a search page with `currentJobId`.
8. Click the extension icon.
9. If using Auth0, paste the API bearer token and click **Save token locally**.
10. Click **Import job**.

## Backend URL and host permissions

The popup uses `http://localhost:4000` by default. You can override it from Chrome extension storage under the `apiBaseUrl` key, for example with `chrome.storage.sync.set({ apiBaseUrl: "https://interviews-tracker-api.onrender.com" })` from the extension devtools context.

Changing `apiBaseUrl` is not enough by itself for production. Chrome also requires the API origin in `host_permissions`. The manifest currently includes:

- `http://localhost:4000/*`
- `https://interviews-tracker-api.onrender.com/*`

If deploying the API to a different host, add that origin to `apps/linkedin-extension/manifest.json` before packaging or loading the extension.

Because extension requests use a `chrome-extension://<extension-id>` origin, the API CORS allow-list must also include the installed extension origin in `CHROME_EXTENSION_ORIGIN` for production-like deployments.

## Auth behavior

The backend's normal production auth expects `Authorization: Bearer <Auth0 access token>`. The extension does not bundle or hardcode secrets. It can send a user-provided bearer token stored in `chrome.storage.local` for the current browser profile.

Local cookie/session-style requests only work if the backend is running in a mode that accepts them; the current production API does **not** treat `credentials: "include"` alone as authentication. If the API returns `401` or `403`, the popup shows a clear auth error and asks for a valid Auth0 API bearer token.

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
