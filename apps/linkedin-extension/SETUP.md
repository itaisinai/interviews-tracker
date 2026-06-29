# Chrome Extension Auth0 Setup - REQUIRED ACTION

## ⚠️ IMPORTANT: Auth0 Configuration Required

The extension now uses **Authorization Code Flow with PKCE** for authentication. Before the extension will work, you **MUST** add the extension's callback URL to Auth0.

## Quick Setup (5 minutes)

### Step 1: Load the Extension

1. Open Chrome: `chrome://extensions`
2. Enable "Developer mode" (toggle top-right)
3. Click "Load unpacked"
4. Select: `apps/linkedin-extension`

### Step 2: Get Your Redirect URI

Chrome generates a unique redirect URI for your extension. You MUST add this exact URL to Auth0.

1. Click the extension icon in Chrome toolbar (popup opens)
2. Right-click the popup → **"Inspect"** (opens DevTools)
3. Go to the **Console** tab
4. Find the log message: **"Add this EXACT URL to Auth0 Allowed Callback URLs:"**
5. **Copy the redirect URI** shown (e.g., `https://abcd1234.chromiumapp.org/`)

**Important**: Do NOT guess the format. Use the exact URL from the console.

### Step 3: Configure Auth0

1. Go to [Auth0 Dashboard](https://manage.auth0.com)
2. Navigate to: **Applications** → **Your Application** (Client ID: `hlI5kn4lePStXeHJohsGqyKnyoBHJtTW`)
3. Find **"Allowed Callback URLs"** section
4. Paste the redirect URI you copied from the console
5. Click **"Save Changes"**

### Step 4: Test

1. Open any LinkedIn job page
2. Click the extension icon
3. Click "Sign in"
4. Authenticate with Auth0
5. The console will show if a refresh token was received
6. Click "Import job"

✅ **Done!** The extension is now fully configured.

**Note**: Check the console after sign-in to see if refresh tokens are working. If you see "Refresh token received: false", tokens will NOT auto-refresh and users will need to sign in again after ~1 hour.

---

## What Changed

### Before (Manual Token)

Users had to:
1. Get an Auth0 access token manually
2. Open extension settings
3. Paste the token
4. Save settings
5. Token expires → repeat process

### After (OAuth Flow)

Users:
1. Click "Sign in" once
2. Authenticate with Auth0
3. Extension handles tokens automatically
4. Tokens refresh automatically
5. Never need to manually paste tokens again

---

## Technical Details

### Authentication Flow

1. **User clicks "Sign in"**
   - Extension generates random `code_verifier` (PKCE)
   - Creates `code_challenge` = SHA256(code_verifier)
   - Builds Auth0 authorization URL with challenge
   - Requests scope: `openid profile email offline_access`

2. **chrome.identity.launchWebAuthFlow**
   - Opens Auth0 login page in system browser
   - User authenticates
   - Auth0 redirects to Chrome's generated redirect URI

3. **Token Exchange**
   - Extension captures authorization `code` from redirect
   - Exchanges `code` + `code_verifier` for access token
   - No client secret needed (PKCE is secure for public clients)

4. **Token Storage**
   - Access token stored in `chrome.storage.local`
   - Refresh token stored (if issued)
   - Token expiry tracked
   - User email extracted from JWT

5. **Automatic Refresh**
   - Before each API call, check if token is expired
   - If expired and refresh token exists, refresh automatically
   - If refresh fails, user signs in again

### Security

- ✅ **No secrets in extension** - PKCE doesn't require client secrets
- ✅ **Tokens encrypted** - Chrome encrypts storage.local
- ✅ **Scoped tokens** - Limited to API audience
- ✅ **Auto-refresh** - Reduces re-authentication
- ✅ **User-controlled** - Sign out clears everything

### Files Changed

| File | Purpose |
|------|---------|
| `manifest.json` | Added `"identity"` permission |
| `src/auth.js` | NEW - Complete PKCE flow implementation |
| `src/popup.html` | Updated UI with Sign in/out buttons |
| `src/popup.js` | Integrated auth module, wire up buttons |
| `README.md` | Quick start guide |
| `TESTING.md` | Complete testing checklist |
| `docs/linkedin-job-import.md` | Updated auth documentation |

### Configuration

Current Auth0 settings in `src/auth.js`:

```javascript
{
  domain: "dev-c1s005zh8spezp0e.us.auth0.com",
  clientId: "hlI5kn4lePStXeHJohsGqyKnyoBHJtTW",
  audience: "https://interviews-tracker-api.com",
  scope: "openid profile email offline_access"
}
```

**Note**: `offline_access` is required for refresh tokens. If Auth0 is not configured to issue refresh tokens, the extension will require re-authentication when access tokens expire (~1 hour).

These values are **safe to commit** (no secrets in PKCE flow).

---

## Troubleshooting

### "Callback URL mismatch"

**Problem**: Auth0 shows error after authentication

**Solution**:
1. Double-check extension ID in Chrome
2. Verify callback URL in Auth0 matches exactly
3. Ensure trailing slash: `chrome-extension://ID/`
4. Save changes in Auth0
5. Wait ~30 seconds for Auth0 cache to clear

### "Authentication failed"

**Problem**: Generic error after sign-in attempt

**Possible causes**:
- Network issue
- Auth0 misconfigured
- Wrong client ID/domain in `src/auth.js`
- User denied permission

**Solution**:
1. Check browser console (right-click extension → Inspect popup)
2. Look for specific error message
3. Verify Auth0 config matches between extension and dashboard

### Import returns 401

**Problem**: Import fails with "Authentication failed"

**Possible causes**:
- API Auth0 config doesn't match extension
- Token audience mismatch
- API not recognizing token

**Solution**:
1. Check API `.env` file:
   ```
   AUTH0_DOMAIN="dev-c1s005zh8spezp0e.us.auth0.com"
   AUTH0_AUDIENCE="https://interviews-tracker-api.com"
   ```
2. Ensure they match extension's `src/auth.js`
3. Restart API server
4. Sign out and sign in again in extension

### Token not persisting

**Problem**: Extension asks to sign in every time popup opens

**Possible causes**:
- Chrome sync issues
- Storage permissions
- Extension reload cleared storage

**Solution**:
1. Check Chrome → Settings → Privacy → Content Settings → Cookies
2. Ensure "Allow all cookies" or allow chrome-extension://
3. Try reinstalling extension
4. Check Application → Storage in DevTools

---

## Development Mode

For local development without Auth0:

### Option 1: API Dev Mode

Enable dev auth in API `.env`:

```env
DEV_MODE_BYPASS_AUTH=true
DEV_MODE_USER_EMAIL="dev@local.test"
```

Extension will get 401 but imports work if API allows it.

### Option 2: Manual Token

1. Get token from web app console:
   ```javascript
   localStorage.getItem('@@auth0spajs@@::hlI5kn4lePStXeHJohsGqyKnyoBHJtTW::https://interviews-tracker-api.com::openid profile email')
   ```
2. Parse JSON, extract `access_token`
3. Extension settings → Paste in "Manual auth token"
4. Click Save

---

## Production Deployment

### Chrome Web Store

1. Test extension thoroughly locally
2. Package extension:
   ```bash
   cd apps/linkedin-extension
   zip -r linkedin-importer.zip . -x "*.DS_Store" -x "test/*" -x "fixtures/*" -x "TESTING.md"
   ```
3. Upload to Chrome Web Store Developer Dashboard
4. Extension ID will change after publishing
5. **IMPORTANT**: Add new production extension ID to Auth0:
   ```
   chrome-extension://<PRODUCTION_EXTENSION_ID>/
   ```

### Auth0 Production Application

If using a separate production Auth0 application:

1. Update `src/auth.js` with production values
2. Rebuild/repackage extension
3. Add production callback URL to Auth0
4. Ensure API uses same Auth0 config

---

## FAQ

**Q: Can users sign in with different Auth0 accounts?**

A: Yes, but the API validates against `ALLOWED_EMAIL`. Only the configured email can import jobs.

**Q: What happens if token expires?**

A: Extension automatically refreshes using refresh token. If refresh fails, user signs in again.

**Q: Is the client ID secret?**

A: No, the client ID is public in PKCE flow. No secrets are needed or stored.

**Q: Can multiple users use the same extension?**

A: Each Chrome profile has separate storage. Different users can sign in on different Chrome profiles.

**Q: What if user closes auth window?**

A: Sign-in fails gracefully. User can click "Sign in" again.

**Q: How long do tokens last?**

A: Default Auth0 access token: 1 hour. Refresh token: 30 days. Both configurable in Auth0.

---

## Support

For issues or questions:

1. Check [TESTING.md](./TESTING.md) for detailed test cases
2. Check [README.md](./README.md) for quick start
3. Check [docs/linkedin-job-import.md](../../docs/linkedin-job-import.md) for full documentation
4. Open Chrome DevTools → Console for error messages
5. Check API logs for authentication errors

---

**Last Updated**: 2026-06-29
