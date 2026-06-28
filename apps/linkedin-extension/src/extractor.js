export function cleanText(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

export function getTextBySelectors(selectors, root = document) {
  for (const selector of selectors) {
    const element = root.querySelector(selector);
    const text = cleanText(element?.innerText || element?.textContent || "");
    if (text) return text;
  }
  return null;
}

export function getJobIdFromUrl(url) {
  try {
    const parsed = new URL(url);
    const currentJobId = parsed.searchParams.get("currentJobId");
    if (currentJobId) return currentJobId;
    return parsed.pathname.match(/\/jobs\/view\/(\d+)/)?.[1] || null;
  } catch {
    return null;
  }
}

export function getRawText(root = document) {
  const main = root.querySelector("main") || root.querySelector(".jobs-search__job-details--container") || root.body;
  return cleanText(main?.innerText || main?.textContent || "");
}

export function getRawHtmlSnippet(root = document) {
  const container = root.querySelector(".jobs-search__job-details--container") || root.querySelector(".jobs-details") || root.querySelector("main");
  const html = container?.outerHTML || null;
  return html ? html.slice(0, 20000) : null;
}

function inferWorkplaceType(text) {
  const normalized = text.toLowerCase();
  if (normalized.includes("hybrid")) return "Hybrid";
  if (normalized.includes("remote")) return "Remote";
  if (normalized.includes("on-site") || normalized.includes("onsite")) return "On-site";
  return null;
}

export function extractLinkedinJobData(root = document, href = window.location.href) {
  // Selectors include current LinkedIn jobs UI classes visible in the attached DOM/screenshot plus generic fallbacks.
  const title = getTextBySelectors([".job-details-jobs-unified-top-card__job-title h1", ".jobs-unified-top-card__job-title", "h1"], root);
  const companyName = getTextBySelectors([".job-details-jobs-unified-top-card__company-name a", ".jobs-unified-top-card__company-name a", ".job-details-jobs-unified-top-card__company-name", ".jobs-unified-top-card__company-name"], root);
  const locationLine = getTextBySelectors([".job-details-jobs-unified-top-card__primary-description-container", ".jobs-unified-top-card__bullet", ".jobs-unified-top-card__subtitle-primary-grouping"], root);
  const descriptionText = getTextBySelectors(["#job-details", ".jobs-description__content", ".jobs-box__html-content", ".jobs-description-content__text"], root);
  const rawText = getRawText(root);
  const pills = Array.from(root.querySelectorAll(".job-details-jobs-unified-top-card__job-insight, .jobs-unified-top-card__job-insight, .artdeco-pill, li")).map((element) => cleanText(element.innerText || element.textContent || "")).filter(Boolean);
  const allText = [locationLine, ...pills, rawText].filter(Boolean).join(" | ");

  return {
    source: "linkedin",
    sourceUrl: href,
    linkedinJobId: getJobIdFromUrl(href),
    title,
    companyName,
    location: locationLine?.split("·")[0]?.trim() || null,
    workplaceType: inferWorkplaceType(allText),
    employmentType: pills.find((text) => /full-time|part-time|contract|internship|temporary/i.test(text)) || null,
    seniority: pills.find((text) => /internship|entry|associate|mid|senior|director|executive/i.test(text)) || null,
    descriptionText,
    rawText: rawText || null,
    rawHtmlSnippet: getRawHtmlSnippet(root),
    extractedAt: new Date().toISOString()
  };
}
