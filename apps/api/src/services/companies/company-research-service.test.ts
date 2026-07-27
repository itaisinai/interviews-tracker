import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCompanyResearchQueries,
  CompanyResearchService,
  getMissingResearchFields,
} from "./company-research-service.js";
import type { CompanySearchProvider } from "./company-search-provider.js";

test("skips funding searches when funding already exists", () => {
  const queries = buildCompanyResearchQueries({
    companyName: "Alta",
    existingCompanyData: {
      funding: "Seed round",
      employees: null,
      location: null,
      customersTraction: null,
      companyDescription: null,
      productDescription: null,
    },
  });

  assert.ok(!queries.some((query) => query.includes("funding investors rounds")));
});

test("forces research even when company already has complete data", () => {
  const queries = buildCompanyResearchQueries({
    companyName: "Notch",
    linkedinUrl: "https://www.linkedin.com/company/notch-ai/",
    forceResearch: true,
    existingCompanyData: {
      funding: "Seed round",
      investmentRounds: "Seed",
      employees: "11-50",
      location: "Tel Aviv",
      customersTraction: "Some traction",
      companyDescription: "Existing company description",
      productDescription: "Existing product description",
    },
  });

  assert.ok(queries.length > 0);
  assert.ok(queries.every((query) => !query.includes("funding investors rounds")));
  assert.ok(queries.some((query) => query.includes("linkedin.com/company")));
});

test("plans missing research fields", () => {
  const missing = getMissingResearchFields({
    funding: null,
    investmentRounds: null,
    employees: null,
    location: null,
    customersTraction: null,
    companyDescription: null,
    productDescription: null,
  });

  assert.deepEqual(missing, {
    funding: true,
    employees: true,
    location: true,
    traction: true,
    descriptions: true,
  });
});

test("promotes company size from evidence when the model misses it", async () => {
  const provider: CompanySearchProvider = {
    async search() {
      return [
        {
          title: "Alta - Crunchbase Company Profile & Funding",
          url: "https://www.crunchbase.com/organization/alta",
          publishedDate: null,
          author: null,
          text: "Alta is a seed-stage company with 11-50 employees and offices in San Francisco.",
          highlights: ["11-50 employees", "Seed"],
        },
        {
          title: "Alta | LinkedIn",
          url: "https://www.linkedin.com/company/alta/",
          publishedDate: null,
          author: null,
          text: "Alta",
          highlights: [],
        },
      ];
    },
  };

  const service = new CompanyResearchService(provider, async ({ companyName }) => ({
    companyName,
    companySearchName: null,
    linkedinUrl: null,
    funding: null,
    totalRaised: null,
    roundsCount: null,
    latestRound: null,
    investors: [],
    investmentRounds: null,
    employees: null,
    location: null,
    domains: [],
    customersTraction: null,
    companyDescription: null,
    productDescription: null,
    sourceUrls: ["https://www.crunchbase.com/organization/alta"],
    confidence: "LOW",
    rawImportantNotes: [],
  }));

  const result = await service.research({
    companyName: "Alta",
    existingCompanyData: {},
  });

  assert.equal(result.employees, "11-50");
  assert.equal(result.linkedinUrl, "https://www.linkedin.com/company/alta/");
  assert.ok(
    result.rawImportantNotes.some(
      (note) => note.toLowerCase().includes("employees") && note.toLowerCase().includes("crunchbase")
    )
  );
});

test("filters malformed URLs from evidence results", async () => {
  const provider: CompanySearchProvider = {
    async search() {
      return [
        {
          title: "Valid Result",
          url: "https://example.com/company",
          publishedDate: null,
          author: null,
          text: "Valid company info",
          highlights: [],
        },
        {
          title: "Malformed URL Result",
          url: "https://",
          publishedDate: null,
          author: null,
          text: "Another result",
          highlights: [],
        },
        {
          title: "Empty hostname",
          url: "http://",
          publishedDate: null,
          author: null,
          text: "More info",
          highlights: [],
        },
      ];
    },
  };

  const service = new CompanyResearchService(provider, async () => ({
    companyName: "Test Company",
    companySearchName: null,
    linkedinUrl: null,
    funding: null,
    totalRaised: null,
    roundsCount: null,
    latestRound: null,
    investors: [],
    investmentRounds: null,
    employees: null,
    location: null,
    domains: [],
    customersTraction: null,
    companyDescription: null,
    productDescription: null,
    sourceUrls: ["https://", "http://valid-extracted.com"],
    confidence: "LOW",
    rawImportantNotes: [],
  }));

  const result = await service.research({
    companyName: "Test Company",
    existingCompanyData: {},
  });

  // Should only include valid URLs from evidence and extracted sources
  assert.ok(result.sourceUrls.includes("https://example.com/company"));
  assert.ok(result.sourceUrls.includes("http://valid-extracted.com"));
  assert.ok(!result.sourceUrls.includes("https://"));
  assert.ok(!result.sourceUrls.includes("http://"));
  assert.equal(result.sourceUrls.length, 2);
});
