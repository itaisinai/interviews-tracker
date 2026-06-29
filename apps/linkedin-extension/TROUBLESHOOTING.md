# Extension Authentication Troubleshooting

## Error: "Sign-in failed: Authorization page could not be loaded"

This error occurs when `chrome.identity.launchWebAuthFlow` cannot open the Auth0 authorization page.

### Quick Fix Steps

#### 1. Check Console for Details

1. **Open DevTools**:
   - Right-click the extension popup
   - Click "Inspect"
   - Go to Console tab

2. **Look for error messages**:
   ```
   === Sign-in Error ===
   Error type: ...
   Error message: ...
   ```

3. **Common error patterns**:
   - `net::ERR_BLOCKED_BY_CLIENT` → Ad blocker or privacy extension blocking
   - `net::ERR_NAME_NOT_RESOLVED` → Network/DNS issue
   - `net::ERR_CONNECTION_REFUSED` → Auth0 server unreachable
   - `Callback URL mismatch` → Redirect URI not configured in Auth0

#### 2. Verify Extension Permissions

1. Go to `chrome://extensions`
2. Find "Interviews Tracker LinkedIn Import"
3. Verify these permissions are listed:
   - ✅ Read and change your data on sites (for LinkedIn)
   - ✅ identity (for Auth0 web flow)
   - ✅ storage
4. If "identity" is missing, the extension needs to be reloaded

#### 3. Reload the Extension

1. Go to `chrome://extensions`
2. Find "Interviews Tracker LinkedIn Import"
3. Click the **Reload** icon (circular arrow)
4. Open extension popup again
5. Try signing in again

#### 4. Verify Auth0 Configuration

**Check the redirect URI in console**:
```
=== Chrome Extension Redirect URI ===
Add this EXACT URL to Auth0 Allowed Callback URLs:
https://mnljpfkhaddfhpckjoihkoccpjffokhf.chromiumapp.org/
```

**Add to Auth0**:
1. Go to [Auth0 Dashboard](https://manage.auth0.com)
2. Applications → Your Application
3. Settings → Allowed Callback URLs
4. Add: `https://mnljpfkhaddfhpckjoihkoccpjffokhf.chromiumapp.org/`
5. Save Changes
6. Wait 30 seconds for Auth0 cache to clear
7. Try signing in again

#### 5. Test Auth0 URL Manually

1. Check console for "Auth URL:"
2. Copy the full URL
3. Open it in a new browser tab
4. **Expected**: Auth0 login page loads
5. **If it doesn't load**: Network or Auth0 configuration issue

Example URL format:
```
https://dev-c1s005zh8spezp0e.us.auth0.com/authorize?response_type=code&client_id=...
```

#### 6. Check for Conflicting Extensions

These extensions can block `chrome.identity`:
- Ad blockers (uBlock Origin, AdBlock, etc.)
- Privacy extensions (Privacy Badger, Ghostery, etc.)
- Security extensions

**Try**:
1. Disable other extensions temporarily
2. Try signing in again
3. Re-enable extensions one by one to find culprit

#### 7. Check Chrome Settings

**Ensure these are allowed**:
1. Go to `chrome://settings/content/popups`
2. Verify "Sites can send pop-ups and use redirects" is ON
3. Or add exception for Auth0 domain

---

## Other Common Issues

### "Callback URL mismatch" in Auth0 Page

**Cause**: Redirect URI in Auth0 doesn't match extension

**Fix**:
1. Check console for actual redirect URI
2. Ensure it's EXACTLY in Auth0 (no typos, no extra spaces)
3. Format: `https://<extension-id>.chromiumapp.org/`

### "Invalid state" Error

**Cause**: Auth flow was interrupted or timed out

**Fix**:
1. Close auth window if still open
2. Try signing in again
3. Complete the flow within 5 minutes

### "Token exchange failed"

**Cause**: Backend Auth0 configuration mismatch

**Fix**:
1. Verify backend has correct Auth0 settings:
   ```env
   AUTH0_DOMAIN=dev-c1s005zh8spezp0e.us.auth0.com
   AUTH0_AUDIENCE=https://interviews-tracker-api.com
   ```
2. Ensure API is running and accessible
3. Check API logs for authentication errors

### "Access denied" After Successful Login

**Cause**: Email not in ALLOWED_EMAIL list

**Fix**:
1. Check backend environment:
   ```env
   ALLOWED_EMAIL=your-email@example.com
   ```
2. Ensure email matches your Auth0 account exactly
3. Restart backend after changing environment

### Extension Loads But Doesn't Detect Jobs

**Not an auth issue** - see main documentation

---

## Advanced Debugging

### Enable Verbose Logging

Add to manifest.json (for development only):
```json
"content_security_policy": {
  "extension_pages": "script-src 'self'; object-src 'self'"
}
```

### Check Network Requests

1. Open DevTools → Network tab
2. Filter by "auth0"
3. Click "Sign in"
4. Look for failed requests
5. Check request/response details

### Verify Extension Context

In popup console, run:
```javascript
chrome.identity.getRedirectURL()
```

Should return:
```
https://mnljpfkhaddfhpckjoihkoccpjffokhf.chromiumapp.org/
```

### Test PKCE Flow Manually

In popup console:
```javascript
// Test code verifier generation
const array = new Uint8Array(32);
crypto.getRandomValues(array);
const base64 = btoa(String.fromCharCode(...array))
  .replace(/\+/g, "-")
  .replace(/\//g, "_")
  .replace(/=+$/, "");
console.log("Code verifier:", base64);

// Should output 43-character string
```

---

## Still Not Working?

### Collect Debug Info

1. **Console output**: Take screenshot of all console messages
2. **Extension details**: From `chrome://extensions`
3. **Auth0 settings**: Screenshot of Allowed Callback URLs
4. **Network tab**: Screenshot of failed requests (if any)

### Check System Requirements

- Chrome version 88+ (for Manifest V3)
- Internet connection
- Auth0 accessible from your network
- No corporate proxy blocking Auth0

### Try Incognito Mode

1. Go to `chrome://extensions`
2. Enable "Allow in Incognito" for the extension
3. Open incognito window
4. Try signing in
5. If it works: conflict with another extension or Chrome setting

### Last Resort: Clean Install

1. Go to `chrome://extensions`
2. Remove extension completely
3. Clear Chrome cache: `chrome://settings/clearBrowserData`
4. Restart Chrome
5. Reload extension from unpacked folder
6. Check console for redirect URI
7. Verify Auth0 configuration
8. Try signing in

---

## Getting Help

If none of these steps work, please provide:

1. Console output (full text or screenshot)
2. Extension ID from `chrome://extensions`
3. Chrome version: `chrome://version`
4. Operating system
5. Any error messages from Auth0 page (if it opens)
6. Network tab screenshot showing failed requests

---

**Last Updated**: 2026-06-29
