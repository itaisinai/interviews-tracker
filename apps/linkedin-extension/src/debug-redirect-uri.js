/**
 * Debug script to display the actual redirect URI that Chrome generates.
 * This must match what's configured in Auth0 Allowed Callback URLs.
 *
 * Run this from the extension popup console to see the actual value.
 */

if (typeof chrome !== "undefined" && chrome.identity) {
  const redirectUri = chrome.identity.getRedirectURL();
  console.log("=== Chrome Identity Redirect URI ===");
  console.log("Actual redirect URI:", redirectUri);
  console.log("");
  console.log("Add this EXACT URL to Auth0 Allowed Callback URLs:");
  console.log(redirectUri);
  console.log("");
  console.log("Auth0 Dashboard → Applications → Your App → Settings → Allowed Callback URLs");
} else {
  console.error("chrome.identity API not available");
}
