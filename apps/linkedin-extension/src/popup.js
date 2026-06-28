import { buildAuthHeaders, getDetectedJobRows, hasUsefulJobContent } from "./popup-utils.js";

const DEFAULT_API_BASE_URL = "http://localhost:4000";
const LINKEDIN_JOB_URL_PATTERN = /^https:\/\/www\.linkedin\.com\/jobs\/(view\/|search\/)/;

const elements = {
  detectedCard: document.getElementById("detected-card"),
  importButton: document.getElementById("import"),
  previewToggle: document.getElementById("preview-toggle"),
  preview: document.getElementById("preview"),
  message: document.getElementById("message"),
  authBadge: document.getElementById("auth-badge"),
  authNote: document.getElementById("auth-note"),
  settings: document.getElementById("settings"),
  settingsToggle: document.getElementById("settings-toggle"),
  footerSettings: document.getElementById("footer-settings"),
  apiBaseUrlInput: document.getElementById("api-base-url"),
  tokenInput: document.getElementById("token"),
  saveSettings: document.getElementById("save-settings"),
  clearToken: document.getElementById("clear-token")
};

let extractedPayload = null;
let activeTab = null;

async function getSettings() {
  const syncSettings = await chrome.storage.sync.get({ apiBaseUrl: DEFAULT_API_BASE_URL });
  const localSettings = await chrome.storage.local.get({ authToken: "" });
  return { apiBaseUrl: syncSettings.apiBaseUrl, authToken: localSettings.authToken };
}

function showMessage(text, type = "info") {
  elements.message.textContent = text;
  elements.message.className = `message show ${type}`;
}

function clearMessage() {
  elements.message.textContent = "";
  elements.message.className = "message";
}

function updateAuthStatus(authToken) {
  const hasToken = Boolean(authToken);
  elements.authBadge.textContent = hasToken ? "Authenticated ✓" : "Token missing";
  elements.authBadge.className = `badge ${hasToken ? "authenticated" : "missing"}`;
  elements.authNote.textContent = hasToken
    ? "Bearer token saved locally in this browser profile."
    : "Production imports require an Auth0 API bearer token. Local dev may work with API dev auth.";
}

function renderDetectedJob(payload) {
  if (!payload) return;
  elements.detectedCard.innerHTML = "";
  for (const row of getDetectedJobRows(payload)) {
    const item = document.createElement("div");
    item.className = `field-row ${row.value ? "" : "missing"}`.trim();
    const status = document.createElement("span");
    status.className = "status";
    status.textContent = row.value ? "✅" : "⚠";
    const value = document.createElement("span");
    value.className = "value";
    value.textContent = row.value || row.missingText;
    item.append(status, value);
    elements.detectedCard.append(item);
  }

  const useful = hasUsefulJobContent(payload);
  elements.importButton.disabled = !useful;
  if (!useful) {
    showMessage("No useful job content was detected on this page. Open a LinkedIn job page with visible title, company, description, or raw job text.", "warning");
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

function isLinkedInJobPage(url) {
  if (!url || !LINKEDIN_JOB_URL_PATTERN.test(url)) return false;
  if (url.includes("/jobs/view/")) return true;
  return url.includes("currentJobId=");
}

async function loadSettingsIntoForm() {
  const settings = await getSettings();
  elements.apiBaseUrlInput.value = settings.apiBaseUrl;
  elements.tokenInput.value = settings.authToken;
  updateAuthStatus(settings.authToken);
}

async function detectCurrentJob() {
  clearMessage();
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  activeTab = tab;

  if (!isLinkedInJobPage(tab?.url || "")) {
    elements.importButton.disabled = true;
    elements.detectedCard.innerHTML = '<div class="field-row missing"><span class="status">⚠</span><span class="value">Not on a supported LinkedIn job page</span></div>';
    showMessage("Open a LinkedIn /jobs/view page or a jobs search page with currentJobId, then reopen the extension.", "warning");
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
    elements.detectedCard.innerHTML = '<div class="field-row missing"><span class="status">⚠</span><span class="value">Could not extract job</span></div>';
    showMessage(error instanceof Error ? error.message : "Could not extract job data from this page.", "error");
  }
}

elements.settingsToggle.addEventListener("click", () => toggleSettings());
elements.footerSettings.addEventListener("click", () => toggleSettings(true));

elements.saveSettings.addEventListener("click", async () => {
  const apiBaseUrl = elements.apiBaseUrlInput.value.trim() || DEFAULT_API_BASE_URL;
  const authToken = elements.tokenInput.value.trim();
  await chrome.storage.sync.set({ apiBaseUrl });
  await chrome.storage.local.set({ authToken });
  updateAuthStatus(authToken);
  showMessage("Settings saved.", "success");
});

elements.clearToken.addEventListener("click", async () => {
  elements.tokenInput.value = "";
  await chrome.storage.local.set({ authToken: "" });
  updateAuthStatus("");
  showMessage("Token cleared. Production imports will require a new Auth0 API bearer token.", "warning");
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
      showMessage("No auth token saved. Trying request anyway for local/dev auth; production will return 401 without a bearer token.", "warning");
    }
    const apiResponse = await fetch(`${apiBaseUrl.replace(/\/$/, "")}/api/job-imports/linkedin`, {
      method: "POST",
      credentials: "include",
      headers: buildAuthHeaders(authToken),
      body: JSON.stringify(extractedPayload)
    });
    if (apiResponse.status === 401 || apiResponse.status === 403) {
      throw new Error("Authentication failed. Paste and save a valid Auth0 API bearer token in Settings, then try again.");
    }
    if (!apiResponse.ok) throw new Error((await apiResponse.json()).message || `Import failed (${apiResponse.status})`);
    const result = await apiResponse.json();
    elements.importButton.textContent = result.duplicate ? "Already imported" : "Imported successfully";
    showMessage(result.duplicate ? "Duplicate opportunity found. No new opportunity was created." : "Imported successfully.", "success");
  } catch (error) {
    elements.importButton.textContent = "Import job";
    showMessage(error instanceof Error ? error.message : "Import failed.", "error");
  } finally {
    elements.importButton.disabled = !hasUsefulJobContent(extractedPayload);
  }
});

Promise.all([loadSettingsIntoForm(), detectCurrentJob()]).catch((error) => {
  showMessage(error instanceof Error ? error.message : "Could not initialize popup.", "error");
});
