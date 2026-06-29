# Production Extension Setup

## Extension Details

**Extension ID**: `mnljpfkhaddfhpckjoihkoccpjffokhf`

**Redirect URI**: `https://mnljpfkhaddfhpckjoihkoccpjffokhf.chromiumapp.org/`

**Production API URL**: `https://interviews-api.trackylab.com/api`

---

## Auth0 Configuration Required

### 1. Add Redirect URI to Auth0

1. Go to [Auth0 Dashboard](https://manage.auth0.com)
2. Navigate to: **Applications** → Your Application (Client ID: `hlI5kn4lePStXeHJohsGqyKnyoBHJtTW`)
3. Find **"Allowed Callback URLs"** section
4. Add this EXACT URL:
   ```
   https://mnljpfkhaddfhpckjoihkoccpjffokhf.chromiumapp.org/
   ```
5. Click **"Save Changes"**

### 2. Verify Auth0 Settings

Ensure these settings are configured:

**Application Type**: Single Page Application (SPA) or Native

**Allowed Callback URLs** should include:
```
https://mnljpfkhaddfhpckjoihkoccpjffokhf.chromiumapp.org/
```

**Refresh Token Rotation**: Enabled (recommended for automatic token refresh)

**Token Endpoint Authentication Method**: None (PKCE flow)

---

## Backend CORS Configuration

The backend must allow requests from the extension origin.

Add to your backend environment variables:

```env
CHROME_EXTENSION_ORIGIN=chrome-extension://mnljpfkhaddfhpckjoihkoccpjffokhf
```

Or update CORS settings to allow:
```
chrome-extension://mnljpfkhaddfhpckjoihkoccpjffokhf
```

---

## Default API URL

The extension is configured to use `http://localhost:4000` by default for development.

To use production API, users can:

1. Click the extension icon
2. Click the gear icon (⚙) to open Settings
3. Change "API base URL" to: `https://interviews-api.trackylab.com/api`
4. Click "Save"

**Note**: The production API URL is already whitelisted in `manifest.json` host permissions.

---

## Testing Production Flow

1. Load the extension in Chrome
2. Open popup → DevTools console
3. Verify console shows:
   ```
   === Chrome Extension Redirect URI ===
   Add this EXACT URL to Auth0 Allowed Callback URLs:
   https://mnljpfkhaddfhpckjoihkoccpjffokhf.chromiumapp.org/
   ```
4. Verify this matches what's in Auth0
5. Click "Sign in"
6. Authenticate with Auth0
7. Console should show: "Token exchange successful"
8. Console should show: "Refresh token received: true"
9. Change API URL in settings to production URL
10. Import a LinkedIn job
11. Verify import succeeds

---

## Extension Distribution

### Chrome Web Store

When publishing to Chrome Web Store:
- Extension ID may change
- New redirect URI will be generated
- Must update Auth0 with new redirect URI

### Unpacked Extension (Current)

- Extension ID: `mnljpfkhaddfhpckjoihkoccpjffokhf`
- This ID is stable for this unpacked extension
- All developers loading this unpacked extension will have the same ID
- Auth0 is already configured with this redirect URI

---

## Troubleshooting

### "Callback URL mismatch" error

- Verify Auth0 has exact URL: `https://mnljpfkhaddfhpckjoihkoccpjffokhf.chromiumapp.org/`
- No trailing spaces or extra characters
- Must be HTTPS, not chrome-extension://

### Import fails with 401

- Check API URL in extension settings
- Verify CORS allows extension origin
- Check backend Auth0 configuration matches extension
- Try signing out and signing in again

### Token not refreshing

- Check console: "Refresh token received: true"
- If false, enable "Refresh Token Rotation" in Auth0
- Ensure `offline_access` scope is allowed in Auth0 API settings

---

**Last Updated**: 2026-06-29
