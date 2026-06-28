export function hasUsefulJobContent(payload) {
  return Boolean(payload?.title || payload?.companyName || payload?.descriptionText || payload?.rawText);
}

export function getDetectedJobRows(payload) {
  return [
    { label: "title", value: payload?.title, missingText: "Missing title" },
    { label: "company", value: payload?.companyName, missingText: "Missing company" },
    { label: "location", value: payload?.location, missingText: "Missing location" },
    { label: "id", value: payload?.linkedinJobId ? `ID: ${payload.linkedinJobId}` : null, missingText: "Missing LinkedIn job ID" }
  ];
}

export function buildAuthHeaders(authToken) {
  const headers = { "Content-Type": "application/json" };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;
  return headers;
}
