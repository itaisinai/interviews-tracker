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

    console.log("[Gmail Filter] Existing company names:", Array.from(existingCompanyNames));
    console.log("[Gmail Filter] Existing domains:", Array.from(existingDomains));
    console.log("[Gmail Filter] Existing domain bases:", Array.from(existingDomainBases));
    console.log("[Gmail Filter] Total candidates:", gmailCandidates.candidates.length);

    const groups = new Map<string, typeof gmailCandidates.candidates>();

    for (const candidate of gmailCandidates.candidates) {
      // Extract company from email domain
      const emailMatch = candidate.from.match(/<([^>]+)>|([^\s<]+@[^\s>]+)/);
      const email = emailMatch?.[1] || emailMatch?.[2] || candidate.from;
      const domain = email.split("@")[1]?.toLowerCase() || "unknown";

      console.log(`[Gmail Filter] Checking candidate:`, {
        subject: candidate.subject,
        from: candidate.from,
        email,
        domain,
      });

      // Skip if this domain matches an existing opportunity
      if (existingDomains.has(domain)) {
        console.log(`[Gmail Filter] ❌ FILTERED OUT by domain: ${domain}`);
        continue;
      }

      // Clean up domain to get company name
      let companyKey = domain.split(".")[0] || domain;

      // Skip if domain base matches an existing opportunity domain
      if (existingDomainBases.has(companyKey)) {
        console.log(`[Gmail Filter] ❌ FILTERED OUT by domain base: ${companyKey}`);
        continue;
      }

      // Try to extract company from subject line as well
      const subjectMatch = candidate.subject.match(/at\s+(\w+)|@\s+(\w+)|with\s+(\w+)/i);
      if (subjectMatch) {
        const subjectCompany = (subjectMatch[1] || subjectMatch[2] || subjectMatch[3])?.toLowerCase();
        if (subjectCompany && subjectCompany.length > 2) {
          companyKey = subjectCompany;
        }
      }

      // Skip if company name matches an existing opportunity
      if (existingCompanyNames.has(companyKey)) {
        console.log(`[Gmail Filter] ❌ FILTERED OUT by company name: ${companyKey}`);
        continue;
      }

      console.log(`[Gmail Filter] ✅ KEPT: ${companyKey} (${candidate.subject.substring(0, 50)}...)`);

      if (!groups.has(companyKey)) {
        groups.set(companyKey, []);
      }
      groups.get(companyKey)!.push(candidate);
    }

    console.log("[Gmail Filter] Final groups:", Array.from(groups.keys()));
    console.log(
      "[Gmail Filter] Group sizes:",
      Array.from(groups.entries()).map(([key, candidates]) => `${key}: ${candidates.length}`)
    );

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

    console.log("[Gmail Filter] filteredCandidates - checking company names:", Array.from(existingCompanyNames));
    console.log("[Gmail Filter] filteredCandidates - checking domains:", Array.from(existingDomains));
    console.log("[Gmail Filter] filteredCandidates - checking domain bases:", Array.from(existingDomainBases));

    const filtered = gmailCandidates.candidates.filter((candidate) => {
      const emailMatch = candidate.from.match(/<([^>]+)>|([^\s<]+@[^\s>]+)/);
      const email = emailMatch?.[1] || emailMatch?.[2] || candidate.from;
      const domain = email.split("@")[1]?.toLowerCase() || "";
      const domainBase = domain.split(".")[0];

      // Check if domain or domain base matches
      if (existingDomains.has(domain) || existingDomainBases.has(domainBase)) {
        console.log(`[Gmail Filter] filteredCandidates - ❌ FILTERED by domain: ${candidate.subject.substring(0, 50)}`);
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
        console.log(
          `[Gmail Filter] filteredCandidates - ❌ FILTERED by company name: ${candidate.subject.substring(0, 50)}`
        );
        return false;
      }

      console.log(`[Gmail Filter] filteredCandidates - ✅ KEPT: ${candidate.subject.substring(0, 50)}`);
      return true;
    });

    console.log(`[Gmail Filter] filteredCandidates result: ${filtered.length} of ${gmailCandidates.candidates.length}`);

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

  return {
    groupedCandidates,
    filteredCandidates,
    emailDateRange,
  };
}

function formatDate(date: Date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}
