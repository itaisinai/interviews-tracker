const extractorModule = import(chrome.runtime.getURL("src/extractor.js"));

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "EXTRACT_LINKEDIN_JOB") return false;
  extractorModule
    .then(({ extractLinkedinJobData }) => sendResponse({ ok: true, payload: extractLinkedinJobData() }))
    .catch((error) => sendResponse({ ok: false, message: error instanceof Error ? error.message : "Extraction failed" }));
  return true;
});
