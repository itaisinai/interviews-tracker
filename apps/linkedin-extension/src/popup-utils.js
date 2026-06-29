export function hasUsefulJobContent(payload) {
  return Boolean(payload?.title || payload?.companyName || payload?.descriptionText || payload?.rawText);
}

export function getDetectedJobRows(payload) {
  return [
    { label: "Job", value: payload?.title, missingText: "Missing title" },
    { label: "Company", value: payload?.companyName, missingText: "Missing company" },
    { label: "Location", value: payload?.location, missingText: "Missing location" }
  ];
}

export function buildAuthHeaders(authToken) {
  const headers = { "Content-Type": "application/json" };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;
  return headers;
}
