# PR #91 Review Comments - Resolution

## Comment 1: ✅ FIXED - Use separate storage keys for OAuth and manual tokens

**Issue**: OAuth storage was reusing the existing `authToken` key that manual tokens use. This caused conflicts:
- Manual tokens would be read as OAuth tokens
- `getValidToken()` would call `signOut()` and clear manual tokens
- OAuth sign-in would populate the manual token input field

**Root Cause**: In `src/auth.js`, line 17:
```javascript
const STORAGE_KEYS = {
  ACCESS_TOKEN: "authToken",  // ❌ Conflicts with manual token key
  ...
}
```

**Fix Applied**:
```javascript
const STORAGE_KEYS = {
  ACCESS_TOKEN: "oauthAccessToken",      // ✅ Separate key
  TOKEN_EXPIRY: "oauthTokenExpiry",      // ✅ Separate key
  USER_EMAIL: "oauthUserEmail",          // ✅ Separate key
  REFRESH_TOKEN: "oauthRefreshToken"     // ✅ Separate key
};
```

**Result**:
- OAuth tokens stored under `oauthAccessToken`, `oauthTokenExpiry`, `oauthUserEmail`, `oauthRefreshToken`
- Manual tokens remain under `authToken` (used by `popup.js`)
- No conflicts between OAuth and manual token flows
- `getValidToken()` only reads OAuth keys, never touches manual token
- Manual token fallback works independently

---

## Comment 2: ✅ FIXED (Previous Commit) - Register the chromiumapp redirect URL

**Issue**: Setup documentation showed `chrome-extension://<EXTENSION_ID>/` format, but Chrome actually returns `https://<extension-id>.chromiumapp.org/`

**Original Documentation**:
```
Add to Auth0: chrome-extension://<EXTENSION_ID>/
```

**Fix Applied** (in previous commit `5d75a38`):
- Added `getRedirectUri()` export function
- Extension logs actual redirect URI to console on every popup open
- Updated all documentation to instruct users to **copy from console**
- Added console output:
  ```
  === Chrome Extension Redirect URI ===
  Add this EXACT URL to Auth0 Allowed Callback URLs:
  https://abc123.chromiumapp.org/
  ```

**Updated Documentation** (`SETUP.md`):
```
1. Click the extension icon (popup opens)
2. Right-click → Inspect → Console
3. Copy the redirect URI shown (e.g., https://abcd1234.chromiumapp.org/)
4. Add that EXACT URL to Auth0
```

**Result**:
- No more redirect URI mismatches
- Users see the actual Chrome-generated URI
- Auth0 accepts the authorization request
- Sign-in completes successfully

---

## Comment 3: ✅ FIXED (Previous Commit) - Request offline_access before relying on refresh tokens

**Issue**: Scope was `"openid profile email"` - missing `offline_access`. Without it:
- Auth0 doesn't include `refresh_token` in response
- `storeAuthData()` stores `null` for refresh token
- `getValidToken()` signs user out when access token expires
- Documented automatic refresh behavior never works

**Original Code**:
```javascript
scope: "openid profile email"  // ❌ Missing offline_access
```

**Fix Applied** (in previous commit `5d75a38`):
```javascript
scope: "openid profile email offline_access"  // ✅ Includes offline_access
```

**Additional Changes**:
- Console logs whether refresh token was received: `"Refresh token received: true/false"`
- `getValidToken()` gracefully handles missing refresh tokens
- Documentation explains `offline_access` requirement
- Documentation includes Auth0 refresh token configuration steps

**Result**:
- Auth0 issues refresh tokens (if configured in Auth0 dashboard)
- Automatic token refresh works as documented
- Users see console feedback about refresh token availability
- Clear error messages if refresh tokens not configured

---

## Summary of Changes

### This PR (chrome-extension-fixes)
- ✅ Fixed storage key conflict (Comment #1)

### Previous PR (Commit 5d75a38)
- ✅ Fixed redirect URI documentation (Comment #2)
- ✅ Added `offline_access` scope (Comment #3)

### Files Modified in This PR
- `apps/linkedin-extension/src/auth.js` - Changed storage keys to `oauth*` prefix

### Verification

**Storage Key Separation**:
```javascript
// OAuth tokens (never conflict with manual tokens)
chrome.storage.local.get([
  "oauthAccessToken",      // OAuth only
  "oauthTokenExpiry",      // OAuth only
  "oauthUserEmail",        // OAuth only
  "oauthRefreshToken"      // OAuth only
]);

// Manual token (used by popup.js for dev/testing)
chrome.storage.local.get(["authToken"]);  // Manual only
```

**No Conflicts**:
- `getValidToken()` reads only `oauth*` keys
- `signOut()` clears only `oauth*` keys
- Manual token input reads/writes only `authToken`
- Both flows work independently

---

## Testing Checklist

- [ ] Load extension with existing manual token saved
- [ ] Sign in with OAuth - verify manual token not cleared
- [ ] Check storage - verify both `authToken` and `oauthAccessToken` exist
- [ ] Sign out - verify only `oauth*` keys cleared, `authToken` remains
- [ ] Import with OAuth - uses `oauthAccessToken`
- [ ] Sign out OAuth, verify manual token fallback still works
- [ ] Clear manual token, verify OAuth still works

---

**Date**: 2026-06-29
**Branch**: chrome-extension-fixes
**Status**: Ready for review
