const DEFAULT_API_BASE_URL = "http://localhost:4000";
const statusEl = document.getElementById("status");
const button = document.getElementById("import");
const tokenInput = document.getElementById("token");
const saveTokenButton = document.getElementById("save-token");

async function getSettings() {
  const syncSettings = await chrome.storage.sync.get({ apiBaseUrl: DEFAULT_API_BASE_URL });
  const localSettings = await chrome.storage.local.get({ authToken: "" });
  return { apiBaseUrl: syncSettings.apiBaseUrl, authToken: localSettings.authToken };
}

async function loadToken() {
  const { authToken } = await getSettings();
  tokenInput.value = authToken;
}

saveTokenButton.addEventListener("click", async () => {
  await chrome.storage.local.set({ authToken: tokenInput.value.trim() });
  statusEl.textContent = tokenInput.value.trim() ? "Token saved locally in this browser profile." : "Token cleared.";
});

button.addEventListener("click", async () => {
  statusEl.textContent = "Importing…";
  button.disabled = true;
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const response = await chrome.tabs.sendMessage(tab.id, { type: "EXTRACT_LINKEDIN_JOB" });
    if (!response?.ok) throw new Error("Could not extract LinkedIn job data.");
    const { apiBaseUrl, authToken } = await getSettings();
    const headers = { "Content-Type": "application/json" };
    if (authToken) headers.Authorization = `Bearer ${authToken}`;
    const apiResponse = await fetch(`${apiBaseUrl.replace(/\/$/, "")}/api/job-imports/linkedin`, {
      method: "POST",
      credentials: "include",
      headers,
      body: JSON.stringify(response.payload)
    });
    if (apiResponse.status === 401 || apiResponse.status === 403) {
      throw new Error("Authentication failed. In production, paste and save a valid Auth0 API bearer token before importing.");
    }
    if (!apiResponse.ok) throw new Error((await apiResponse.json()).message || `Import failed (${apiResponse.status})`);
    const result = await apiResponse.json();
    statusEl.textContent = result.duplicate ? "Already imported." : "Imported successfully.";
  } catch (error) {
    statusEl.textContent = error instanceof Error ? error.message : "Import failed.";
  } finally {
    button.disabled = false;
  }
});

loadToken().catch(() => {
  statusEl.textContent = "Could not load extension auth settings.";
});
