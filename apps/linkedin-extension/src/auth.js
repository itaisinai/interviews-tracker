/**
 * Auth0 authentication for Chrome extension using Authorization Code Flow with PKCE.
 *
 * Chrome extensions cannot securely store client secrets, so we use PKCE (Proof Key for Code Exchange)
 * which is designed for public clients. The flow:
 *
 * 1. Generate a random code_verifier
 * 2. Create code_challenge = base64url(sha256(code_verifier))
 * 3. Launch Auth0 authorization URL with code_challenge
 * 4. User authenticates, Auth0 redirects to chrome-extension://EXTENSION_ID/
 * 5. Extract authorization code from redirect URL
 * 6. Exchange code + code_verifier for access token via /oauth/token
 * 7. Store token and expiry in chrome.storage.local
 */

const STORAGE_KEYS = {
  ACCESS_TOKEN: "oauthAccessToken",
  TOKEN_EXPIRY: "oauthTokenExpiry",
  USER_EMAIL: "oauthUserEmail",
  REFRESH_TOKEN: "oauthRefreshToken"
};

/**
 * Get Auth0 configuration from environment or defaults.
 * These values should be set at build time or configured by the user.
 */
function getAuth0Config() {
  return {
    domain: "dev-c1s005zh8spezp0e.us.auth0.com",
    clientId: "hlI5kn4lePStXeHJohsGqyKnyoBHJtTW",
    audience: "https://interviews-tracker-api.com",
    redirectUri: chrome.identity.getRedirectURL(),
    scope: "openid profile email offline_access"
  };
}

/**
 * Get the redirect URI that Chrome will use.
 * This must be added to Auth0 Allowed Callback URLs.
 * @returns {string} The redirect URI (e.g., https://<extension-id>.chromiumapp.org/)
 */
export function getRedirectUri() {
  return chrome.identity.getRedirectURL();
}

/**
 * Generate a cryptographically random code verifier for PKCE.
 * Must be 43-128 characters from [A-Z][a-z][0-9]._~-
 */
function generateCodeVerifier() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64UrlEncode(array);
}

/**
 * Create a code challenge from the verifier using SHA-256.
 */
async function generateCodeChallenge(verifier) {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return base64UrlEncode(new Uint8Array(hash));
}

/**
 * Base64url encode (RFC 4648 §5) without padding.
 */
function base64UrlEncode(buffer) {
  const bytes = Array.from(buffer);
  const base64 = btoa(String.fromCharCode(...bytes));
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Build the Auth0 authorization URL for PKCE flow.
 */
async function buildAuthUrl(codeChallenge) {
  const config = getAuth0Config();
  const params = new URLSearchParams({
    response_type: "code",
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: config.scope,
    audience: config.audience,
    code_challenge: codeChallenge,
    code_challenge_method: "S256"
  });
  return `https://${config.domain}/authorize?${params.toString()}`;
}

/**
 * Parse the authorization code from the redirect URL.
 * Returns { code, error } where one will be set.
 */
function parseRedirectUrl(redirectUrl) {
  const url = new URL(redirectUrl);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");

  if (error) {
    return { error: errorDescription || error };
  }

  if (!code) {
    return { error: "No authorization code received" };
  }

  return { code };
}

/**
 * Exchange authorization code for access token using PKCE.
 */
async function exchangeCodeForToken(code, codeVerifier) {
  const config = getAuth0Config();

  const response = await fetch(`https://${config.domain}/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      grant_type: "authorization_code",
      client_id: config.clientId,
      code,
      code_verifier: codeVerifier,
      redirect_uri: config.redirectUri
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error_description || `Token exchange failed: ${response.status}`);
  }

  return await response.json();
}

/**
 * Decode JWT to extract user information (email).
 * Only decodes the payload, does NOT verify signature (backend does that).
 */
function decodeJwt(token) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

/**
 * Extract email from JWT payload.
 * Handles both direct email claim and namespaced email claims.
 */
function extractEmail(payload) {
  if (!payload) return null;

  if (payload.email) {
    return payload.email;
  }

  const namespacedKey = Object.keys(payload).find(key => key.endsWith("/email"));
  if (namespacedKey) {
    return payload[namespacedKey];
  }

  return null;
}

/**
 * Store authentication data in chrome.storage.local.
 */
async function storeAuthData(tokenData) {
  const payload = decodeJwt(tokenData.access_token);
  const email = extractEmail(payload);

  const expiresIn = tokenData.expires_in || 3600;
  const expiryTime = Date.now() + (expiresIn * 1000);

  await chrome.storage.local.set({
    [STORAGE_KEYS.ACCESS_TOKEN]: tokenData.access_token,
    [STORAGE_KEYS.TOKEN_EXPIRY]: expiryTime,
    [STORAGE_KEYS.USER_EMAIL]: email,
    [STORAGE_KEYS.REFRESH_TOKEN]: tokenData.refresh_token || null
  });

  return { email };
}

/**
 * Get stored authentication data.
 */
export async function getAuthData() {
  const data = await chrome.storage.local.get([
    STORAGE_KEYS.ACCESS_TOKEN,
    STORAGE_KEYS.TOKEN_EXPIRY,
    STORAGE_KEYS.USER_EMAIL,
    STORAGE_KEYS.REFRESH_TOKEN
  ]);

  return {
    accessToken: data[STORAGE_KEYS.ACCESS_TOKEN] || null,
    tokenExpiry: data[STORAGE_KEYS.TOKEN_EXPIRY] || null,
    userEmail: data[STORAGE_KEYS.USER_EMAIL] || null,
    refreshToken: data[STORAGE_KEYS.REFRESH_TOKEN] || null
  };
}

/**
 * Check if the current token is expired or will expire soon (within 5 minutes).
 */
export function isTokenExpired(tokenExpiry) {
  if (!tokenExpiry) return true;
  const bufferMs = 5 * 60 * 1000;
  return Date.now() >= (tokenExpiry - bufferMs);
}

/**
 * Attempt to refresh the access token using a refresh token.
 */
async function refreshAccessToken(refreshToken) {
  const config = getAuth0Config();

  const response = await fetch(`https://${config.domain}/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      grant_type: "refresh_token",
      client_id: config.clientId,
      refresh_token: refreshToken
    })
  });

  if (!response.ok) {
    throw new Error("Token refresh failed");
  }

  return await response.json();
}

/**
 * Main sign-in function using chrome.identity.launchWebAuthFlow.
 * Returns { success: true, email } on success, or { success: false, error } on failure.
 */
export async function signIn() {
  try {
    const config = getAuth0Config();

    console.log("=== Auth0 Sign-In Debug Info ===");
    console.log("Redirect URI:", config.redirectUri);
    console.log("Add this EXACT URL to Auth0 Allowed Callback URLs:");
    console.log(config.redirectUri);
    console.log("Auth0 Domain:", config.domain);
    console.log("Client ID:", config.clientId);
    console.log("Scope:", config.scope);
    console.log("================================");

    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    const authUrl = await buildAuthUrl(codeChallenge);

    console.log("Launching Auth0 authorization URL...");
    console.log("Auth URL:", authUrl);

    const redirectUrl = await chrome.identity.launchWebAuthFlow({
      url: authUrl,
      interactive: true
    });

    console.log("Auth flow completed successfully");

    console.log("Auth redirect URL received:", redirectUrl);

    const { code, error } = parseRedirectUrl(redirectUrl);

    if (error) {
      return { success: false, error };
    }

    const tokenData = await exchangeCodeForToken(code, codeVerifier);
    console.log("Token exchange successful");
    console.log("Refresh token received:", Boolean(tokenData.refresh_token));

    const { email } = await storeAuthData(tokenData);

    return { success: true, email };
  } catch (error) {
    console.error("=== Sign-in Error ===");
    console.error("Error type:", error?.constructor?.name);
    console.error("Error message:", error instanceof Error ? error.message : String(error));
    console.error("Full error:", error);
    console.error("===================");

    let errorMessage = "Authentication failed";
    if (error instanceof Error) {
      errorMessage = error.message;
      // Provide more helpful messages for common errors
      if (error.message.includes("could not be loaded")) {
        errorMessage = "Could not open Auth0 login page. Check console for details.";
      } else if (error.message.includes("User cancelled")) {
        errorMessage = "Sign-in cancelled.";
      }
    }

    return {
      success: false,
      error: errorMessage
    };
  }
}

/**
 * Sign out by clearing all stored authentication data.
 */
export async function signOut() {
  await chrome.storage.local.remove([
    STORAGE_KEYS.ACCESS_TOKEN,
    STORAGE_KEYS.TOKEN_EXPIRY,
    STORAGE_KEYS.USER_EMAIL,
    STORAGE_KEYS.REFRESH_TOKEN
  ]);
}

/**
 * Get a valid access token, refreshing if necessary.
 * Returns { token, email } on success, or { token: null, needsReauth: true } if expired and no refresh available.
 */
export async function getValidToken() {
  const authData = await getAuthData();

  if (!authData.accessToken) {
    return { token: null, needsReauth: false };
  }

  if (isTokenExpired(authData.tokenExpiry)) {
    if (authData.refreshToken) {
      try {
        console.log("Access token expired, attempting refresh...");
        const tokenData = await refreshAccessToken(authData.refreshToken);
        console.log("Token refresh successful");
        const { email } = await storeAuthData(tokenData);
        return { token: tokenData.access_token, email, needsReauth: false };
      } catch (error) {
        console.error("Token refresh failed:", error);
        console.warn("User will need to sign in again");
        await signOut();
        return { token: null, needsReauth: true };
      }
    } else {
      console.warn("Access token expired and no refresh token available - user must sign in again");
      await signOut();
      return { token: null, needsReauth: true };
    }
  }

  return { token: authData.accessToken, email: authData.userEmail, needsReauth: false };
}
