# Testing Checklist for Auth0 Integration

## Prerequisites

1. API running on `http://localhost:4000` (or configure different URL in settings)
2. Chrome browser
3. Valid LinkedIn account
4. Access to Auth0 Application settings

## Setup Steps

### 1. Load Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions`
2. Enable "Developer mode" (toggle in top-right corner)
3. Click "Load unpacked"
4. Navigate to and select: `apps/linkedin-extension`

### 2. Get the Redirect URI

1. Click the extension icon in Chrome toolbar (popup opens)
2. Right-click the popup → "Inspect" (opens DevTools)
3. Go to the Console tab
4. **IMPORTANT**: Copy the exact redirect URI shown in the console
   - You'll see: "Add this EXACT URL to Auth0 Allowed Callback URLs:"
   - Example format: `https://abcd1234efgh5678.chromiumapp.org/`
   - **Do NOT guess or assume the format** - use the exact URL from console

### 3. Configure Auth0 Callback URL

1. Go to Auth0 Dashboard → Applications → Your Application
2. Find "Allowed Callback URLs" field
3. Paste the redirect URI you copied from the console
4. Optionally enable "Refresh Token Rotation" for automatic token refresh
5. Click "Save Changes"

## Test Cases

### Test 1: Initial State (Not Signed In)

1. Open any LinkedIn job page: `https://www.linkedin.com/jobs/view/*`
2. Click the extension icon in Chrome toolbar
3. **Expected**:
   - Badge shows "Not signed in"
   - Auth note says "Sign in with Auth0 to import jobs"
   - "Sign in" button is visible
   - "Sign out" button is NOT visible
   - Job detection works (shows detected job info)

### Test 2: Sign In Flow

1. From popup, click "Sign in" button
2. **Expected**:
   - Button text changes to "Signing in…"
   - Button is disabled
   - Auth0 login page opens in new window
3. Enter Auth0 credentials and authenticate
4. **Expected**:
   - Auth0 window closes automatically
   - Success message appears: "Signed in successfully as [email]"
   - Badge changes to "Signed in ✓"
   - User email is displayed below badge
   - "Sign in" button disappears
   - "Sign out" button appears
   - Auth note changes to "You can now import jobs."

### Test 3: Import Job While Signed In

1. Ensure you're signed in (from Test 2)
2. On a LinkedIn job page, open the extension
3. Click "Import job" button
4. **Expected**:
   - Button text changes to "Importing…"
   - Button is disabled briefly
   - Request includes `Authorization: Bearer <token>` header
   - Success message appears (or duplicate message if already imported)
   - Button text changes to "Imported successfully" or "Already imported"

### Test 4: Persistence Across Popup Opens

1. Sign in (if not already)
2. Close the extension popup
3. Reopen the extension popup
4. **Expected**:
   - Still shows "Signed in ✓"
   - User email still displayed
   - No need to sign in again
   - Import functionality works immediately

### Test 5: Sign Out Flow

1. While signed in, click "Sign out" button
2. **Expected**:
   - Badge changes back to "Not signed in"
   - User email disappears
   - "Sign out" button disappears
   - "Sign in" button reappears
   - Message: "Signed out successfully."
   - Attempting to import now would fail with auth error

### Test 6: Token Refresh (Optional - requires waiting)

This test verifies automatic token refresh. **Only works if Auth0 is configured to issue refresh tokens.**

1. Sign in
2. Check console for: "Refresh token received: true"
   - If false, skip this test - refresh tokens not configured
3. Wait for token to expire (default: ~1 hour, or configure Auth0 for shorter expiration)
4. Try to import a job
5. **Expected** (if refresh tokens enabled):
   - Console shows: "Access token expired, attempting refresh..."
   - Console shows: "Token refresh successful"
   - Import succeeds without requiring re-authentication
   - No visible interruption to user
6. **Expected** (if refresh tokens NOT enabled):
   - Import fails with auth error
   - User must sign in again

### Test 7: Manual Token Fallback (Dev Mode)

1. Sign out if signed in
2. Click settings icon (gear)
3. Paste a valid Auth0 token in "Manual auth token" field
4. Click "Save"
5. **Expected**:
   - Badge shows "Manual token ✓"
   - Note says "Using manual token from settings."
   - Import works with manual token
6. Click "Sign in" and complete OAuth flow
7. **Expected**:
   - OAuth token takes precedence over manual token
   - Badge shows "Signed in ✓" (not "Manual token")

### Test 8: Error Handling - Invalid Callback URL

1. Remove or modify the callback URL in Auth0 settings (make it incorrect)
2. Try to sign in
3. **Expected**:
   - Auth0 shows error: "Callback URL mismatch" or "redirect_uri_mismatch"
   - Extension shows error message
   - User remains not signed in
4. Restore correct callback URL
5. Retry sign in
6. **Expected**:
   - Sign in succeeds

### Test 9: Error Handling - Network Issues

1. Disconnect from internet
2. Try to sign in
3. **Expected**:
   - Error message: "Authentication failed" or similar
   - User remains not signed in
4. Reconnect and retry
5. **Expected**:
   - Sign in succeeds

### Test 10: Settings Panel

1. Click settings icon (gear) or "Settings" link
2. **Expected**:
   - Settings panel expands
   - API base URL field shows current value
   - Manual token field is empty (unless set)
3. Change API base URL
4. Click "Save"
5. **Expected**:
   - Success message
   - New URL persists across popup opens

## Verification Checklist

- [ ] Extension loads without errors
- [ ] Extension ID added to Auth0 Allowed Callback URLs
- [ ] Sign in opens Auth0 page
- [ ] Sign in completes and closes auth window
- [ ] Token is stored in `chrome.storage.local`
- [ ] Import sends `Authorization: Bearer <token>` header
- [ ] Token persists across popup opens
- [ ] Sign out clears token
- [ ] Manual token works as fallback
- [ ] Settings persist correctly

## Debugging Tips

### View Extension Logs

1. Right-click extension icon → "Inspect popup"
2. Console tab shows logs and errors
3. Application → Storage → Local Storage → `chrome-extension://<ID>`
4. Check for `authToken`, `tokenExpiry`, `userEmail`

### Check Network Requests

1. Inspect popup (right-click → Inspect)
2. Network tab
3. Filter by "linkedin" or "auth0"
4. Verify Authorization header is present

### Common Issues

**"callback_mismatch" error:**
- Extension ID in Auth0 doesn't match actual extension ID
- Missing trailing slash in callback URL
- Wrong Auth0 application

**"Invalid bearer token":**
- Token expired and refresh failed
- Auth0 audience mismatch
- API Auth0 configuration incorrect

**"No authorization code received":**
- User closed auth window before completing
- Auth0 misconfigured
- Browser blocked popup

**Import fails with 401:**
- Token not stored correctly
- API not recognizing token
- Check API logs for auth errors

## Expected Chrome Console Output

When working correctly, you should see:

```
Sign-in initiated
Auth URL: https://dev-j6pmcuq1teb8y1mw.us.auth0.com/authorize?...
Token exchange successful
User email: user@example.com
Token stored
```

When errors occur:

```
Sign-in error: [error message]
Token refresh failed: [error message]
```

## Manual Token Testing (Development Only)

For testing without full OAuth flow:

1. Get token from web app: `localStorage.getItem('auth0.token')`
2. Or use Auth0 "Get Access Token" test feature
3. Paste into extension Settings → Manual auth token
4. Click Save
5. Verify import works

Note: Manual tokens are for development only. Production users should use OAuth flow.
