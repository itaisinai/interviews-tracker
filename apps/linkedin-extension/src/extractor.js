export function cleanText(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
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

/**
 * Multi-strategy extraction: try multiple approaches and pick the best result.
 * LinkedIn's HTML changes frequently, so we can't rely on specific selectors.
 */

function extractTitleCandidates(root, jobId) {
  const candidates = [];

  // Strategy 1: Link containing job ID
  if (jobId) {
    const jobLinks = root.querySelectorAll(`a[href*="${jobId}"]`);
    jobLinks.forEach(link => {
      const text = cleanText(link.textContent);
      if (text && text.length > 5 && text.length < 200) {
        candidates.push({ text, confidence: 'high', source: 'job-id-link' });
      }
    });
  }

  // Strategy 2: H1 elements (most common for job titles)
  root.querySelectorAll('h1').forEach(h1 => {
    const text = cleanText(h1.textContent);
    if (text && text.length > 5 && text.length < 200) {
      candidates.push({ text, confidence: 'high', source: 'h1' });
    }
  });

  // Strategy 3: Links with "job" in className or near job-related elements
  root.querySelectorAll('a').forEach(link => {
    const text = cleanText(link.textContent);
    const hasJobClass = link.className.toLowerCase().includes('job') ||
                        link.className.toLowerCase().includes('title');
    if (text && text.length > 10 && text.length < 200 && hasJobClass) {
      candidates.push({ text, confidence: 'medium', source: 'job-class-link' });
    }
  });

  // Strategy 4: Common job title patterns in text
  root.querySelectorAll('p, span, div').forEach(el => {
    const text = cleanText(el.textContent);
    const hasJobKeywords = /engineer|developer|manager|designer|analyst|architect|director|specialist|consultant/i.test(text);
    if (text && text.length > 10 && text.length < 100 && hasJobKeywords && !text.includes('·')) {
      candidates.push({ text, confidence: 'low', source: 'keyword-match' });
    }
  });

  return candidates;
}

function extractCompanyCandidates(root) {
  const candidates = [];

  // Strategy 1: Links to /company/ pages
  root.querySelectorAll('a[href*="/company/"]').forEach(link => {
    const text = cleanText(link.textContent);
    const ariaLabel = link.getAttribute('aria-label');
    const hasCompanyLabel = ariaLabel && ariaLabel.toLowerCase().includes('company');
    if (text && text.length > 1 && text.length < 100) {
      candidates.push({
        text,
        confidence: hasCompanyLabel ? 'high' : 'medium',
        source: 'company-link'
      });
    }
  });

  // Strategy 2: Elements with "company" in className
  root.querySelectorAll('[class*="company" i]').forEach(el => {
    const text = cleanText(el.textContent);
    if (text && text.length > 1 && text.length < 100 && !text.includes('·')) {
      candidates.push({ text, confidence: 'medium', source: 'company-class' });
    }
  });

  return candidates;
}

function extractLocationCandidates(root) {
  const candidates = [];

  // Strategy 1: Text with location pattern "City, Region, Country"
  root.querySelectorAll('p, span, div').forEach(el => {
    const text = cleanText(el.textContent);

    // Pattern: "City, State/Region, Country · other info"
    const match = text.match(/^([^·]+?)(?:·|$)/);
    if (match) {
      const potentialLocation = match[1].trim();
      const hasCommas = (potentialLocation.match(/,/g) || []).length >= 1;
      const hasLocationKeywords = /\b(District|State|Province|County|City|USA|UK|Israel|India|Remote)\b/i.test(potentialLocation);

      if ((hasCommas || hasLocationKeywords) && potentialLocation.length > 5 && potentialLocation.length < 150) {
        candidates.push({ text: potentialLocation, confidence: 'high', source: 'location-pattern' });
      }
    }
  });

  // Strategy 2: Elements with "location" in className
  root.querySelectorAll('[class*="location" i]').forEach(el => {
    const text = cleanText(el.textContent);
    if (text && text.length > 5 && text.length < 150) {
      candidates.push({ text, confidence: 'medium', source: 'location-class' });
    }
  });

  return candidates;
}

function extractDescriptionCandidates(root) {
  const candidates = [];

  // Strategy 1: Section with "About the job" header
  root.querySelectorAll('h2, h3').forEach(header => {
    const headerText = cleanText(header.textContent).toLowerCase();
    if (headerText.includes('about the job') || headerText.includes('job description')) {
      let current = header.nextElementSibling;
      let description = '';
      while (current && description.length < 10000) {
        const text = cleanText(current.textContent);
        if (text && !text.toLowerCase().includes('about the company')) {
          description += text + '\n';
          current = current.nextElementSibling;
        } else {
          break;
        }
      }
      if (description.length > 100) {
        candidates.push({ text: description.trim(), confidence: 'high', source: 'about-job-section' });
      }
    }
  });

  // Strategy 2: Large text blocks (likely description)
  root.querySelectorAll('div, section, article').forEach(el => {
    const text = cleanText(el.textContent);
    if (text.length > 500 && text.length < 20000) {
      // Check if it looks like a job description
      const hasJobKeywords = /responsibilities|requirements|qualifications|experience|skills/i.test(text);
      if (hasJobKeywords) {
        candidates.push({ text, confidence: 'medium', source: 'large-text-block' });
      }
    }
  });

  // Strategy 3: Common selectors (fallback)
  const commonSelectors = [
    '#job-details',
    '.jobs-description__content',
    '.jobs-box__html-content',
    '.jobs-description-content__text',
    '[class*="description" i]'
  ];

  commonSelectors.forEach(selector => {
    const el = root.querySelector(selector);
    if (el) {
      const text = cleanText(el.textContent);
      if (text && text.length > 100) {
        candidates.push({ text, confidence: 'medium', source: 'common-selector' });
      }
    }
  });

  return candidates;
}

function extractBadges(root) {
  const badges = new Set();

  // Strategy 1: Short text elements with job-related keywords
  root.querySelectorAll('span, a, button, li').forEach(el => {
    const text = cleanText(el.textContent);
    if (text.length < 40 && text.length > 2) {
      const isJobKeyword = /^(on-site|remote|hybrid|full-time|part-time|contract|internship|temporary|entry|mid-senior|senior|director|executive|associate)$/i.test(text);
      if (isJobKeyword) {
        badges.add(text);
      }
    }
  });

  // Strategy 2: Common badge selectors
  const badgeSelectors = [
    '.artdeco-pill',
    '[class*="pill" i]',
    '[class*="badge" i]',
    '[class*="insight" i]'
  ];

  badgeSelectors.forEach(selector => {
    root.querySelectorAll(selector).forEach(el => {
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
  const confidenceOrder = { 'high': 3, 'medium': 2, 'low': 1 };
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
  const workplaceType = badges.find(b => /^(on-site|remote|hybrid)$/i.test(b)) || null;
  const employmentType = badges.find(b => /^(full-time|part-time|contract|internship|temporary)$/i.test(b)) || null;
  const seniority = badges.find(b => /^(entry|associate|mid-senior|senior|director|executive)$/i.test(b)) || null;

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
    extractedAt: new Date().toISOString()
  };
}
