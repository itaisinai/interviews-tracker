const DEFAULT_API_BASE_URL = "http://localhost:4000";
const statusEl = document.getElementById("status");
const button = document.getElementById("import");

async function getApiBaseUrl() {
  const stored = await chrome.storage.sync.get({ apiBaseUrl: DEFAULT_API_BASE_URL });
  return stored.apiBaseUrl;
}

button.addEventListener("click", async () => {
  statusEl.textContent = "Importing…";
  button.disabled = true;
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const response = await chrome.tabs.sendMessage(tab.id, { type: "EXTRACT_LINKEDIN_JOB" });
    if (!response?.ok) throw new Error("Could not extract LinkedIn job data.");
    const apiBaseUrl = await getApiBaseUrl();
    const apiResponse = await fetch(`${apiBaseUrl.replace(/\/$/, "")}/api/job-imports/linkedin`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(response.payload)
    });
    if (!apiResponse.ok) throw new Error((await apiResponse.json()).message || `Import failed (${apiResponse.status})`);
    const result = await apiResponse.json();
    statusEl.textContent = result.duplicate ? "Already imported." : "Imported successfully.";
  } catch (error) {
    statusEl.textContent = error instanceof Error ? error.message : "Import failed.";
  } finally {
    button.disabled = false;
  }
});
