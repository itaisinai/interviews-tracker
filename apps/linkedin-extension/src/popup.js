import { getAuthData, getRedirectUri, getValidToken, signIn, signOut } from "./auth.js";
import { buildAuthHeaders, getDetectedJobRows, hasUsefulJobContent } from "./popup-utils.js";

const DEFAULT_API_BASE_URL = "http://localhost:4000";
const LINKEDIN_JOB_URL_PATTERN = /^https:\/\/www\.linkedin\.com\/jobs\/(view\/|search\/|search-results\/)/;

const elements = {
  detectedCard: document.getElementById("detected-card"),
  refetchButton: document.getElementById("refetch"),
  importButton: document.getElementById("import"),
  previewToggle: document.getElementById("preview-toggle"),
  preview: document.getElementById("preview"),
  message: document.getElementById("message"),
  authBadge: document.getElementById("auth-badge"),
  authNote: document.getElementById("auth-note"),
  authUserInfo: document.getElementById("auth-user-info"),
  authActions: document.getElementById("auth-actions"),
  authSignedInActions: document.getElementById("auth-signed-in-actions"),
  signInButton: document.getElementById("sign-in"),
  signOutButton: document.getElementById("sign-out"),
  settings: document.getElementById("settings"),
  settingsToggle: document.getElementById("settings-toggle"),
  footerSettings: document.getElementById("footer-settings"),
  apiBaseUrlInput: document.getElementById("api-base-url"),
  tokenInput: document.getElementById("token"),
  saveSettings: document.getElementById("save-settings"),
  clearToken: document.getElementById("clear-token"),
};

let extractedPayload = null;

function logRedirectUriForSetup() {
  const redirectUri = getRedirectUri();
  console.log("=== Chrome Extension Redirect URI ===");
  console.log("Add this EXACT URL to Auth0 Allowed Callback URLs:");
  console.log(redirectUri);
  console.log("");
  console.log("Steps:");
  console.log("1. Go to Auth0 Dashboard");
  console.log("2. Applications → Your Application");
  console.log("3. Settings → Allowed Callback URLs");
  console.log("4. Add:", redirectUri);
  console.log("5. Save Changes");
  console.log("====================================");
}

async function getSettings() {
  const syncSettings = await chrome.storage.sync.get({ apiBaseUrl: DEFAULT_API_BASE_URL });
  const localSettings = await chrome.storage.local.get({ authToken: "" });
  const { token: oauthToken } = await getValidToken();

  const authToken = oauthToken || localSettings.authToken;

  return { apiBaseUrl: syncSettings.apiBaseUrl, authToken };
}

function showMessage(text, type = "info") {
  elements.message.textContent = text;
  elements.message.className = `message show ${type}`;
}

function clearMessage() {
  elements.message.textContent = "";
  elements.message.className = "message";
}

async function updateAuthStatus() {
  const authData = await getAuthData();
  const localSettings = await chrome.storage.local.get({ authToken: "" });
  const hasManualToken = Boolean(localSettings.authToken);
  const hasOAuthToken = Boolean(authData.accessToken);
  const hasToken = hasOAuthToken || hasManualToken;

  if (hasOAuthToken) {
    elements.authBadge.textContent = "Signed in ✓";
    elements.authBadge.className = "badge authenticated";
    elements.authUserInfo.textContent = authData.userEmail ? `Signed in as ${authData.userEmail}` : "Signed in";
    elements.authUserInfo.classList.remove("hidden");
    elements.authNote.textContent = "You can now import jobs.";
    elements.authActions.classList.add("hidden");
    elements.authSignedInActions.classList.remove("hidden");
  } else if (hasManualToken) {
    elements.authBadge.textContent = "Manual token ✓";
    elements.authBadge.className = "badge authenticated";
    elements.authUserInfo.classList.add("hidden");
    elements.authNote.textContent = "Using manual token from settings.";
    elements.authActions.classList.remove("hidden");
    elements.authSignedInActions.classList.add("hidden");
  } else {
    elements.authBadge.textContent = "Not signed in";
    elements.authBadge.className = "badge missing";
    elements.authUserInfo.classList.add("hidden");
    elements.authNote.textContent = "Sign in with Auth0 to import jobs.";
    elements.authActions.classList.remove("hidden");
    elements.authSignedInActions.classList.add("hidden");
  }
}

function clearDetectedCard() {
  while (elements.detectedCard.firstChild) {
    elements.detectedCard.firstChild.remove();
  }
}

function appendDetectedRow({ label, value, missingText }) {
  const item = document.createElement("div");
  item.className = `field-row ${value ? "" : "missing"}`.trim();
  const status = document.createElement("span");
  status.className = "status";
  status.textContent = value ? "✅" : "⚠";
  const labelSpan = document.createElement("span");
  labelSpan.className = "label";
  labelSpan.textContent = `${label}:`;
  const text = document.createElement("span");
  text.className = "value";
  text.textContent = value || missingText;
  item.append(status, labelSpan, text);
  elements.detectedCard.append(item);
}

function renderDetectedJob(payload) {
  if (!payload) return;
  clearDetectedCard();
  for (const row of getDetectedJobRows(payload)) {
    appendDetectedRow(row);
  }

  const useful = hasUsefulJobContent(payload);
  elements.importButton.disabled = !useful;
  if (!useful) {
    showMessage(
      "No useful job content was detected on this page. Open a LinkedIn job page with visible title, company, description, or raw job text.",
      "warning"
    );
  }
}

function updatePreview() {
  if (!extractedPayload) {
    elements.preview.textContent = "No extracted payload yet.";
    return;
  }
  elements.preview.textContent = JSON.stringify(extractedPayload, null, 2);
}

function toggleSettings(force) {
  const shouldShow = typeof force === "boolean" ? force : !elements.settings.classList.contains("show");
  elements.settings.classList.toggle("show", shouldShow);
}

async function getApiErrorMessage(response) {
  try {
    const payload = await response.json();
    return payload?.message || `Import failed (${response.status})`;
  } catch {
    return `Import failed (${response.status})`;
  }
}

function isLinkedInJobPage(url) {
  if (!url || !LINKEDIN_JOB_URL_PATTERN.test(url)) return false;
  if (url.includes("/jobs/view/")) return true;
  return url.includes("currentJobId=");
}

async function loadSettingsIntoForm() {
  const syncSettings = await chrome.storage.sync.get({ apiBaseUrl: DEFAULT_API_BASE_URL });
  const localSettings = await chrome.storage.local.get({ authToken: "" });
  elements.apiBaseUrlInput.value = syncSettings.apiBaseUrl;
  elements.tokenInput.value = localSettings.authToken;
  await updateAuthStatus();
}

async function detectCurrentJob() {
  clearMessage();
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!isLinkedInJobPage(tab?.url || "")) {
    elements.importButton.disabled = true;
    clearDetectedCard();
    appendDetectedRow({ value: null, missingText: "Not on a supported LinkedIn job page" });
    showMessage(
      "Open a LinkedIn /jobs/view page or a jobs search page with currentJobId, then reopen the extension.",
      "warning"
    );
    return;
  }

  try {
    const response = await chrome.tabs.sendMessage(tab.id, { type: "EXTRACT_LINKEDIN_JOB" });
    if (!response?.ok || !response.payload) throw new Error(response?.message || "Could not extract job data.");
    extractedPayload = response.payload;
    renderDetectedJob(extractedPayload);
    updatePreview();
  } catch (error) {
    elements.importButton.disabled = true;
    clearDetectedCard();
    appendDetectedRow({ value: null, missingText: "Could not extract job" });
    showMessage(error instanceof Error ? error.message : "Could not extract job data from this page.", "error");
  }
}

elements.settingsToggle.addEventListener("click", () => toggleSettings());
elements.footerSettings.addEventListener("click", () => toggleSettings(true));

elements.refetchButton.addEventListener("click", async () => {
  elements.refetchButton.textContent = "⏳";
  elements.refetchButton.disabled = true;
  clearMessage();
  await detectCurrentJob();
  elements.refetchButton.textContent = "🔄";
  elements.refetchButton.disabled = false;
  showMessage("Job data refreshed", "info");
});

elements.signInButton.addEventListener("click", async () => {
  elements.signInButton.textContent = "Signing in…";
  elements.signInButton.disabled = true;
  clearMessage();

  try {
    const result = await signIn();
    if (result.success) {
      showMessage(`Signed in successfully as ${result.email}`, "success");
      await updateAuthStatus();
    } else {
      showMessage(`Sign-in failed: ${result.error}`, "error");
    }
  } catch (error) {
    showMessage(error instanceof Error ? error.message : "Sign-in failed.", "error");
  } finally {
    elements.signInButton.textContent = "Sign in";
    elements.signInButton.disabled = false;
  }
});

elements.signOutButton.addEventListener("click", async () => {
  await signOut();
  await updateAuthStatus();
  showMessage("Signed out successfully.", "info");
});

elements.saveSettings.addEventListener("click", async () => {
  const apiBaseUrl = elements.apiBaseUrlInput.value.trim() || DEFAULT_API_BASE_URL;
  const authToken = elements.tokenInput.value.trim();
  await chrome.storage.sync.set({ apiBaseUrl });
  await chrome.storage.local.set({ authToken });
  await updateAuthStatus();
  showMessage("Settings saved.", "success");
});

elements.clearToken.addEventListener("click", async () => {
  elements.tokenInput.value = "";
  await chrome.storage.local.set({ authToken: "" });
  await updateAuthStatus();
  showMessage("Manual token cleared.", "warning");
});

elements.previewToggle.addEventListener("click", () => {
  updatePreview();
  const shown = elements.preview.classList.toggle("show");
  elements.previewToggle.textContent = shown ? "👁 Hide extracted data" : "👁 Preview extracted data";
});

elements.importButton.addEventListener("click", async () => {
  if (!extractedPayload || !hasUsefulJobContent(extractedPayload)) {
    showMessage("Cannot import because no useful job content was detected.", "warning");
    return;
  }

  elements.importButton.textContent = "Importing…";
  elements.importButton.disabled = true;
  clearMessage();

  try {
    const { apiBaseUrl, authToken } = await getSettings();
    if (!authToken) {
      showMessage(
        "No auth token saved. Trying request anyway for local/dev auth; production will return 401 without a bearer token.",
        "warning"
      );
    }
    const apiResponse = await fetch(`${apiBaseUrl.replace(/\/$/, "")}/api/job-imports/linkedin`, {
      method: "POST",
      credentials: "include",
      headers: buildAuthHeaders(authToken),
      body: JSON.stringify(extractedPayload),
    });
    if (apiResponse.status === 401 || apiResponse.status === 403) {
      throw new Error(
        "Authentication failed. Paste and save a valid Auth0 API bearer token in Settings, then try again."
      );
    }
    if (!apiResponse.ok) throw new Error(await getApiErrorMessage(apiResponse));
    const result = await apiResponse.json();
    elements.importButton.textContent = result.duplicate ? "Already imported" : "Imported successfully";
    showMessage(
      result.duplicate ? "Duplicate opportunity found. No new opportunity was created." : "Imported successfully.",
      "success"
    );
  } catch (error) {
    elements.importButton.textContent = "Import job";
    showMessage(error instanceof Error ? error.message : "Import failed.", "error");
  } finally {
    elements.importButton.disabled = !hasUsefulJobContent(extractedPayload);
  }
});

logRedirectUriForSetup();

Promise.all([loadSettingsIntoForm(), detectCurrentJob()]).catch((error) => {
  showMessage(error instanceof Error ? error.message : "Could not initialize popup.", "error");
});
