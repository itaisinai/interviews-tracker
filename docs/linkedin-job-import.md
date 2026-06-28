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
2. Open Chrome and go to `chrome://extensions`.
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select `apps/linkedin-extension`.
6. Open a LinkedIn job page matching `https://www.linkedin.com/jobs/view/*` or a search page with `currentJobId`.
7. Click the extension icon.
8. Click **Import job**.

## Backend URL configuration

The popup uses `http://localhost:4000` by default. You can override it from Chrome extension storage under the `apiBaseUrl` key, for example with `chrome.storage.sync.set({ apiBaseUrl: "https://your-api.example.com" })` from the extension service worker/devtools context.

## Required environment variables

The backend uses the existing API authentication configuration. LinkedIn import normalization requires:

```env
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-4o-mini # optional; defaults to the existing backend default
```

## Auth notes

The endpoint is mounted under `/api`, so it uses the existing `requireAuth` middleware. The extension sends requests with `credentials: "include"` so cookie-based same-site/local setups can work. If the deployed API requires Auth0 bearer tokens and no compatible cookie/session is available to the extension, follow-up work is needed to add an extension-safe Auth0 token flow. Do not store secrets in the extension.

## Known limitations

- LinkedIn DOM can change, so extraction uses selector fallbacks and may need maintenance.
- The user must be logged in to LinkedIn and viewing the job page.
- The extension only reads currently visible page content.
- This does not use LinkedIn's official API.
- Secrets must not be stored in the extension.
- Duplicate detection uses `linkedinJobId` when present, otherwise the exact `sourceUrl`.
