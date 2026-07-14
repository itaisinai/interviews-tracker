import { useMemo } from "react";

import { useQuery } from "@tanstack/react-query";

import { api } from "../../../lib/api";
import type { GmailCandidatesResult } from "../types";

export function useGmailFilter(gmailCandidates: GmailCandidatesResult | null) {
  const existingOpportunities = useQuery({
    queryKey: ["opportunities"],
    queryFn: () => api.opportunities(),
  });

  const groupedCandidates = useMemo(() => {
    if (!gmailCandidates?.candidates) return new Map<string, GmailCandidatesResult["candidates"]>();

    // Build a set of existing company names and domains to filter out
    const existingCompanyNames = new Set(
      (existingOpportunities.data ?? []).map((opp) => opp.company.name.toLowerCase())
    );
    const existingDomains = new Set(
      (existingOpportunities.data ?? [])
        .flatMap((opp) => opp.company.domains?.map((d) => d.domain.label.toLowerCase()) ?? [])
        .filter(Boolean)
    );

    // Also build a set of domain base names (e.g., "unframe" from "unframe.ai")
    const existingDomainBases = new Set(Array.from(existingDomains).map((d) => d.split(".")[0]));

    // First, group by thread ID to find conversation threads
    const threadGroups = new Map<string, typeof gmailCandidates.candidates>();

    for (const candidate of gmailCandidates.candidates) {
      if (!threadGroups.has(candidate.threadId)) {
        threadGroups.set(candidate.threadId, []);
      }
      threadGroups.get(candidate.threadId)!.push(candidate);
    }

    // Debug: log thread information for vero-security emails
    console.log(
      "[Thread Debug] Thread groups:",
      Array.from(threadGroups.entries()).map(([threadId, emails]) => ({
        threadId,
        count: emails.length,
        subjects: emails.map((e) => e.subject),
        froms: emails.map((e) => e.from),
      }))
    );

    // Now group by company, using thread information
    const groups = new Map<string, typeof gmailCandidates.candidates>();
    const subjectToCompanyKey = new Map<string, string>(); // Track subject -> company mapping
    const threadsWithoutCompany: (typeof gmailCandidates.candidates)[] = [];

    // FIRST PASS: Process threads WITH company emails
    for (const threadCandidates of threadGroups.values()) {
      // Find the company email (not gmail.com) in the thread to determine the group key
      const companyEmail = threadCandidates.find((c) => {
        const emailMatch = c.from.match(/<([^>]+)>|([^\s<]+@[^\s>]+)/);
        const email = emailMatch?.[1] || emailMatch?.[2] || c.from;
        const domain = email.split("@")[1]?.toLowerCase() || "";
        // Skip gmail.com, googlemail.com - these are user's own replies
        return !domain.includes("gmail.com") && !domain.includes("googlemail.com");
      });

      // If no company email found (all are from user), defer to second pass
      if (!companyEmail) {
        threadsWithoutCompany.push(threadCandidates);
        continue;
      }

      // Extract company from the company email
      const emailMatch = companyEmail.from.match(/<([^>]+)>|([^\s<]+@[^\s>]+)/);
      const email = emailMatch?.[1] || emailMatch?.[2] || companyEmail.from;
      const domain = email.split("@")[1]?.toLowerCase() || "unknown";

      // Skip if this domain matches an existing opportunity
      if (existingDomains.has(domain)) {
        continue;
      }

      // Clean up domain to get company name
      let companyKey = domain.split(".")[0] || domain;

      // Skip if domain base matches an existing opportunity domain
      if (existingDomainBases.has(companyKey)) {
        continue;
      }

      // Try to extract company from subject line as well
      const subjectMatch = companyEmail.subject.match(/at\s+(\w+)|@\s+(\w+)|with\s+(\w+)/i);
      if (subjectMatch) {
        const subjectCompany = (subjectMatch[1] || subjectMatch[2] || subjectMatch[3])?.toLowerCase();
        if (subjectCompany && subjectCompany.length > 2) {
          companyKey = subjectCompany;
        }
      }

      // Skip if company name matches an existing opportunity
      if (existingCompanyNames.has(companyKey)) {
        continue;
      }

      // Add all emails from this thread to the company group
      if (!groups.has(companyKey)) {
        groups.set(companyKey, []);
      }
      groups.get(companyKey)!.push(...threadCandidates);

      // Track this subject for future matching
      const normalizedSubject = companyEmail.subject
        .replace(/^(Re|Fwd|Fw):\s*/gi, "")
        .toLowerCase()
        .trim();
      subjectToCompanyKey.set(normalizedSubject, companyKey);
    }

    // SECOND PASS: Process threads WITHOUT company emails (only user replies)
    for (const threadCandidates of threadsWithoutCompany) {
      // Normalize subject (remove Re:, Fwd:, etc.)
      const normalizedSubject = threadCandidates[0].subject
        .replace(/^(Re|Fwd|Fw):\s*/gi, "")
        .toLowerCase()
        .trim();

      // Check if we've seen this subject before
      const existingCompanyKey = subjectToCompanyKey.get(normalizedSubject);
      if (existingCompanyKey && groups.has(existingCompanyKey)) {
        // Add to existing group
        groups.get(existingCompanyKey)!.push(...threadCandidates);
      }
      // Otherwise skip - can't determine company
    }

    return groups;
  }, [gmailCandidates, existingOpportunities.data]);

  const filteredCandidates = useMemo(() => {
    if (!gmailCandidates?.candidates) return [];

    // Build a set of existing company names to filter out
    const existingCompanyNames = new Set(
      (existingOpportunities.data ?? []).map((opp) => opp.company.name.toLowerCase())
    );

    // Build a set of existing company domains to filter out
    const existingDomains = new Set(
      (existingOpportunities.data ?? [])
        .flatMap((opp) => opp.company.domains?.map((d) => d.domain.label.toLowerCase()) ?? [])
        .filter(Boolean)
    );

    // Also build a set of domain base names (e.g., "unframe" from "unframe.ai")
    const existingDomainBases = new Set(Array.from(existingDomains).map((d) => d.split(".")[0]));

    const filtered = gmailCandidates.candidates.filter((candidate) => {
      const emailMatch = candidate.from.match(/<([^>]+)>|([^\s<]+@[^\s>]+)/);
      const email = emailMatch?.[1] || emailMatch?.[2] || candidate.from;
      const domain = email.split("@")[1]?.toLowerCase() || "";
      const domainBase = domain.split(".")[0];

      // Check if domain or domain base matches
      if (existingDomains.has(domain) || existingDomainBases.has(domainBase)) {
        return false;
      }

      // Extract company name from domain or subject
      let companyKey = domainBase;
      const subjectMatch = candidate.subject.match(/at\s+(\w+)|@\s+(\w+)|with\s+(\w+)/i);
      if (subjectMatch) {
        const subjectCompany = (subjectMatch[1] || subjectMatch[2] || subjectMatch[3])?.toLowerCase();
        if (subjectCompany && subjectCompany.length > 2) {
          companyKey = subjectCompany;
        }
      }

      // Check if company name matches
      if (existingCompanyNames.has(companyKey)) {
        return false;
      }

      return true;
    });

    return filtered;
  }, [gmailCandidates, existingOpportunities.data]);

  const emailDateRange = useMemo(() => {
    if (!filteredCandidates || filteredCandidates.length === 0) return null;

    const dates = filteredCandidates.map((c) => new Date(c.date).getTime());
    const oldest = new Date(Math.min(...dates));
    const newest = new Date(Math.max(...dates));

    return {
      oldest: formatDate(oldest),
      newest: formatDate(newest),
    };
  }, [filteredCandidates]);

  // Build a set of all email IDs that are in groups WITH MORE THAN 1 EMAIL (for filtering singles)
  // Single-email groups should appear in the singles list instead
  const groupedEmailIds = useMemo(() => {
    const ids = new Set<string>();
    for (const candidates of groupedCandidates.values()) {
      // Only include emails from groups with multiple emails
      if (candidates.length > 1) {
        for (const candidate of candidates) {
          ids.add(candidate.id);
        }
      }
    }
    return ids;
  }, [groupedCandidates]);

  return {
    groupedCandidates,
    filteredCandidates,
    emailDateRange,
    groupedEmailIds,
  };
}

function formatDate(date: Date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}
