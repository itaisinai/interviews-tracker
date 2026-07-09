export function cleanText(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .trim();
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
  const container =
    root.querySelector(".jobs-search__job-details--container") ||
    root.querySelector(".jobs-details") ||
    root.querySelector("main");
  const html = container?.outerHTML || null;
  return html ? html.slice(0, 20000) : null;
}

/**
 * Multi-strategy extraction: try multiple approaches and pick the best result.
 * LinkedIn's HTML changes frequently, so we can't rely on specific selectors.
 */

function isPromotionalText(text) {
  // Filter out LinkedIn promotional content
  const promoPatterns = [
    /get hired/i,
    /try premium/i,
    /₪\d+|€\d+|\$\d+|£\d+/, // Price indicators
    /upgrade/i,
    /subscribe/i,
    /job search faster/i,
  ];
  return promoPatterns.some((pattern) => pattern.test(text));
}

function extractTitleCandidates(root, jobId) {
  const candidates = [];

  // Strategy 1: Link containing job ID
  if (jobId) {
    const jobLinks = root.querySelectorAll(`a[href*="${jobId}"]`);
    jobLinks.forEach((link) => {
      const text = cleanText(link.textContent);
      if (text && text.length > 5 && text.length < 200 && !isPromotionalText(text)) {
        candidates.push({ text, confidence: "high", source: "job-id-link" });
      }
    });
  }

  // Strategy 2: H1 elements (most common for job titles)
  root.querySelectorAll("h1").forEach((h1) => {
    const text = cleanText(h1.textContent);
    if (text && text.length > 5 && text.length < 200 && !isPromotionalText(text)) {
      candidates.push({ text, confidence: "high", source: "h1" });
    }
  });

  // Strategy 3: Links with "job" in className or near job-related elements
  root.querySelectorAll("a").forEach((link) => {
    const text = cleanText(link.textContent);
    const hasJobClass = link.className.toLowerCase().includes("job") || link.className.toLowerCase().includes("title");
    if (text && text.length > 10 && text.length < 200 && hasJobClass && !isPromotionalText(text)) {
      candidates.push({ text, confidence: "medium", source: "job-class-link" });
    }
  });

  // Strategy 4: Common job title patterns in text
  root.querySelectorAll("p, span, div").forEach((el) => {
    const text = cleanText(el.textContent);
    const hasJobKeywords = /engineer|developer|manager|designer|analyst|architect|director|specialist|consultant/i.test(
      text
    );
    if (
      text &&
      text.length > 10 &&
      text.length < 100 &&
      hasJobKeywords &&
      !text.includes("·") &&
      !isPromotionalText(text)
    ) {
      candidates.push({ text, confidence: "low", source: "keyword-match" });
    }
  });

  return candidates;
}

function extractCompanyCandidates(root) {
  const candidates = [];

  // Strategy 1: Specific company name selectors (highest priority)
  const specificSelectors = [
    ".job-details-jobs-unified-top-card__company-name a",
    ".jobs-unified-top-card__company-name a",
  ];

  specificSelectors.forEach((selector) => {
    const el = root.querySelector(selector);
    if (el) {
      const text = cleanText(el.textContent);
      if (text && text.length > 1 && text.length < 100 && !isPromotionalText(text)) {
        candidates.push({ text, confidence: "high", source: "specific-company-selector" });
      }
    }
  });

  // Strategy 2: Links to /company/ pages
  root.querySelectorAll('a[href*="/company/"]').forEach((link) => {
    const text = cleanText(link.textContent);
    const ariaLabel = link.getAttribute("aria-label");
    const hasCompanyLabel = ariaLabel && ariaLabel.toLowerCase().includes("company");

    // Skip navigation links like "Show more", "Follow", etc.
    const isNavigationLink = /^(show|view|follow|see|learn)\s/i.test(text);

    if (text && text.length > 1 && text.length < 100 && !isNavigationLink && !isPromotionalText(text)) {
      candidates.push({
        text,
        confidence: hasCompanyLabel ? "high" : "medium",
        source: "company-link",
      });
    }
  });

  // Strategy 3: Elements with "company" in className
  root.querySelectorAll('[class*="company" i]').forEach((el) => {
    const text = cleanText(el.textContent);
    const isNavigationText = /^(show|view|follow|see|learn)\s/i.test(text);
    if (text && text.length > 1 && text.length < 100 && !text.includes("·") && !isNavigationText) {
      candidates.push({ text, confidence: "low", source: "company-class" });
    }
  });

  return candidates;
}

function extractLocationCandidates(root) {
  const candidates = [];

  // Strategy 1: Specific location selectors (highest priority)
  const specificSelectors = [
    ".job-details-jobs-unified-top-card__tertiary-description-container span:first-child",
    ".jobs-unified-top-card__subtitle-primary-grouping span:first-child",
  ];

  specificSelectors.forEach((selector) => {
    const el = root.querySelector(selector);
    if (el) {
      const text = cleanText(el.textContent);
      // Extract just the location part before any "·"
      const locationMatch = text.match(/^([^·]+)/);
      if (locationMatch) {
        const location = locationMatch[1].trim();
        const hasCommas = (location.match(/,/g) || []).length >= 1;
        const hasLocationKeywords =
          /\b(District|State|Province|County|City|USA|UK|Israel|India|Remote|On-site|Hybrid)\b/i.test(location);

        if (location.length > 5 && location.length < 150 && (hasCommas || hasLocationKeywords)) {
          candidates.push({ text: location, confidence: "high", source: "specific-location-selector" });
        }
      }
    }
  });

  // Strategy 2: Find all spans and paragraphs, look for location patterns near job title
  root.querySelectorAll("p, span").forEach((el) => {
    // Get direct text content of this element only (not nested children)
    const text = cleanText(el.textContent);

    // Skip if too short, too long, or contains UI text
    if (text.length < 10 || text.length > 200) return;
    if (/search by|filter by|keyword|apply|save|show more|follow/i.test(text)) return;

    // Check if this looks like a location (has commas and/or location keywords)
    const hasCommas = (text.match(/,/g) || []).length >= 1;
    const hasLocationKeywords =
      /\b(District|State|Province|County|City|USA|UK|Israel|India|Remote|On-site|Hybrid|Tel Aviv|New York|San Francisco|London|Berlin)\b/i.test(
        text
      );

    if (hasCommas || hasLocationKeywords) {
      // Extract location before "·" if present
      const locationMatch = text.match(/^([^·]+?)(?:\s*·|$)/);
      if (locationMatch) {
        const location = locationMatch[1].trim();

        // Verify it's not just a time reference or number
        if (
          !/^\d+\s+(hour|day|week|month|year|ago)/i.test(location) &&
          !/^over \d+/i.test(location) &&
          location.length > 8
        ) {
          candidates.push({
            text: location,
            confidence: hasCommas ? "high" : "medium",
            source: "location-pattern-flexible",
          });
        }
      }
    }
  });

  // Strategy 3: Old design - span.tvm__text
  root.querySelectorAll("span.tvm__text").forEach((el) => {
    const text = cleanText(el.textContent);
    if (/search by|filter by|keyword/i.test(text)) return;

    const match = text.match(/^([^·]+?)(?:·|$)/);
    if (match) {
      const potentialLocation = match[1].trim();
      const hasCommas = (potentialLocation.match(/,/g) || []).length >= 1;
      const hasLocationKeywords =
        /\b(District|State|Province|County|City|USA|UK|Israel|India|Remote|On-site|Hybrid)\b/i.test(potentialLocation);

      if ((hasCommas || hasLocationKeywords) && potentialLocation.length > 5 && potentialLocation.length < 150) {
        candidates.push({ text: potentialLocation, confidence: "high", source: "location-tvm-text" });
      }
    }
  });

  // Strategy 4: Elements with "location" in className
  root.querySelectorAll('[class*="location" i]').forEach((el) => {
    const text = cleanText(el.textContent);
    if (text && text.length > 5 && text.length < 150 && !/search by|filter by|keyword/i.test(text)) {
      candidates.push({ text, confidence: "medium", source: "location-class" });
    }
  });

  return candidates;
}

function extractDescriptionCandidates(root) {
  const candidates = [];

  // Strategy 1: Section with "About the job" header
  root.querySelectorAll("h2, h3").forEach((header) => {
    const headerText = cleanText(header.textContent).toLowerCase();
    if (headerText.includes("about the job") || headerText.includes("job description")) {
      let current = header.nextElementSibling;
      let description = "";
      while (current && description.length < 10000) {
        const text = cleanText(current.textContent);
        if (text && !text.toLowerCase().includes("about the company")) {
          description += text + "\n";
          current = current.nextElementSibling;
        } else {
          break;
        }
      }
      if (description.length > 100) {
        candidates.push({ text: description.trim(), confidence: "high", source: "about-job-section" });
      }
    }
  });

  // Strategy 2: Large text blocks (likely description)
  root.querySelectorAll("div, section, article").forEach((el) => {
    const text = cleanText(el.textContent);
    if (text.length > 500 && text.length < 20000) {
      // Check if it looks like a job description
      const hasJobKeywords = /responsibilities|requirements|qualifications|experience|skills/i.test(text);
      if (hasJobKeywords) {
        candidates.push({ text, confidence: "medium", source: "large-text-block" });
      }
    }
  });

  // Strategy 3: Common selectors (fallback)
  const commonSelectors = [
    "#job-details",
    ".jobs-description__content",
    ".jobs-box__html-content",
    ".jobs-description-content__text",
    '[class*="description" i]',
  ];

  commonSelectors.forEach((selector) => {
    const el = root.querySelector(selector);
    if (el) {
      const text = cleanText(el.textContent);
      if (text && text.length > 100) {
        candidates.push({ text, confidence: "medium", source: "common-selector" });
      }
    }
  });

  return candidates;
}

function extractBadges(root) {
  const badges = new Set();

  // Strategy 1: Short text elements with job-related keywords
  root.querySelectorAll("span, a, button, li").forEach((el) => {
    const text = cleanText(el.textContent);
    if (text.length < 40 && text.length > 2) {
      const isJobKeyword =
        /^(on-site|remote|hybrid|full-time|part-time|contract|internship|temporary|entry|mid-senior|senior|director|executive|associate)$/i.test(
          text
        );
      if (isJobKeyword) {
        badges.add(text);
      }
    }
  });

  // Strategy 2: Common badge selectors
  const badgeSelectors = [".artdeco-pill", '[class*="pill" i]', '[class*="badge" i]', '[class*="insight" i]'];

  badgeSelectors.forEach((selector) => {
    root.querySelectorAll(selector).forEach((el) => {
      const text = cleanText(el.textContent);
      if (text && text.length < 40) {
        badges.add(text);
      }
    });
  });

  return Array.from(badges);
}

function pickBestCandidate(candidates) {
  if (!candidates || candidates.length === 0) return null;

  // Sort by confidence: high > medium > low
  const confidenceOrder = { high: 3, medium: 2, low: 1 };
  const sorted = candidates.sort((a, b) => confidenceOrder[b.confidence] - confidenceOrder[a.confidence]);

  return sorted[0].text;
}

export function extractLinkedinJobData(root = document, href = window.location.href) {
  const jobId = getJobIdFromUrl(href);

  // Extract candidates using multiple strategies
  const titleCandidates = extractTitleCandidates(root, jobId);
  const companyCandidates = extractCompanyCandidates(root);
  const locationCandidates = extractLocationCandidates(root);
  const descriptionCandidates = extractDescriptionCandidates(root);
  const badges = extractBadges(root);

  // Pick best candidates
  const title = pickBestCandidate(titleCandidates);
  const companyName = pickBestCandidate(companyCandidates);
  const location = pickBestCandidate(locationCandidates);
  const descriptionText = pickBestCandidate(descriptionCandidates);

  // Extract metadata from badges
  const workplaceType = badges.find((b) => /^(on-site|remote|hybrid)$/i.test(b)) || null;
  const employmentType = badges.find((b) => /^(full-time|part-time|contract|internship|temporary)$/i.test(b)) || null;
  const seniority = badges.find((b) => /^(entry|associate|mid-senior|senior|director|executive)$/i.test(b)) || null;

  const rawText = getRawText(root);
  const rawHtmlSnippet = getRawHtmlSnippet(root);

  return {
    source: "linkedin",
    sourceUrl: href,
    linkedinJobId: jobId,
    title,
    companyName,
    location,
    workplaceType,
    employmentType,
    seniority,
    descriptionText,
    rawText: rawText || null,
    rawHtmlSnippet,
    extractedAt: new Date().toISOString(),
  };
}
