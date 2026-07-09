import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { useQuery } from "@tanstack/react-query";

import { MaterialIcon, PageLoadingState } from "@interviews-tracker/design-system";

import { api } from "../lib/api";
import {
  buildGlobalSearchResults,
  countSearchResults,
  type GlobalSearchResults,
  SEARCH_DEBOUNCE_MS,
  SEARCH_MIN_QUERY_LENGTH,
} from "../lib/global-search";

const filters: Array<{ key: "all" | keyof GlobalSearchResults; label: string }> = [
  { key: "all", label: "All results" },
  { key: "companies", label: "Companies" },
  { key: "opportunities", label: "Opportunities" },
  { key: "interactions", label: "Interactions" },
];
const sectionLabels = { companies: "Companies", opportunities: "Opportunities", interactions: "Interactions" } as const;

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initial = searchParams.get("q") ?? "";
  const urlQuery = searchParams.get("q") ?? "";
  const [query, setQuery] = useState(initial);
  const [debouncedQuery, setDebouncedQuery] = useState(initial);
  const [filter, setFilter] = useState<(typeof filters)[number]["key"]>("all");

  const enabled = debouncedQuery.trim().length >= SEARCH_MIN_QUERY_LENGTH;
  const companies = useQuery({ queryKey: ["companies"], queryFn: api.companies, enabled });
  const opportunities = useQuery({
    queryKey: ["opportunities", "global-search"],
    queryFn: () => api.opportunities(),
    enabled,
  });
  const interactions = useQuery({ queryKey: ["interactions"], queryFn: api.interactions, enabled });

  useEffect(() => {
    setQuery(urlQuery);
    setDebouncedQuery(urlQuery);
  }, [urlQuery]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const value = query.trim();
      setDebouncedQuery(value);
      setSearchParams(value ? { q: value } : {}, { replace: true });
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [query, setSearchParams]);

  const results = useMemo(
    () =>
      buildGlobalSearchResults({
        companies: companies.data ?? [],
        opportunities: opportunities.data ?? [],
        interactions: interactions.data ?? [],
        query: debouncedQuery,
      }),
    [companies.data, debouncedQuery, interactions.data, opportunities.data]
  );
  const total = countSearchResults(results);
  const isLoading = enabled && (companies.isLoading || opportunities.isLoading || interactions.isLoading);
  const visibleSections = (Object.keys(sectionLabels) as Array<keyof GlobalSearchResults>).filter(
    (key) => filter === "all" || filter === key
  );

  if (isLoading) return <PageLoadingState title="Search" description="Searching your career workspace." />;

  return (
    <div className="space-y-8">
      <div className="max-w-2xl">
        <div className="relative">
          <MaterialIcon name="search" className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          <input
            aria-label="Search results query"
            className="w-full rounded-xl border border-outline-variant bg-surface-container-lowest py-3 pl-12 pr-10 text-body-lg shadow-sm focus:border-primary focus:ring-2 focus:ring-primary/20"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search companies, opportunities, interactions"
          />
          {query ? (
            <button
              aria-label="Clear search"
              className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant"
              onClick={() => setQuery("")}
            >
              <MaterialIcon name="close" />
            </button>
          ) : null}
        </div>
      </div>
      <header>
        <h2 className="font-headline-lg text-headline-lg font-bold text-on-background">
          Search results for “{debouncedQuery.trim() || query.trim()}”
        </h2>
        <p className="mt-2 text-body-md text-on-surface-variant">
          {total ? `${total} results found` : "No results found"}
        </p>
      </header>
      <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
        <aside className="space-y-1">
          {filters.map((item) => {
            const count = item.key === "all" ? total : results[item.key].length;
            const active = filter === item.key;
            return (
              <button
                key={item.key}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-3 text-left font-label-lg text-label-lg ${active ? "border-l-4 border-primary bg-surface-container-low text-primary" : "text-on-surface-variant hover:bg-surface-container-low"}`}
                onClick={() => setFilter(item.key)}
              >
                <span>{item.label}</span>
                <span className="rounded-full bg-surface-container-high px-2 py-0.5 text-label-sm">{count}</span>
              </button>
            );
          })}
        </aside>
        <main className="min-h-[420px] space-y-7">
          {total ? (
            visibleSections.map((key) =>
              results[key].length ? (
                <section key={key}>
                  <h3 className="mb-3 font-title-md text-title-md font-bold">{sectionLabels[key]}</h3>
                  <div className="space-y-3">
                    {results[key].map((item) => (
                      <Link
                        key={`${item.type}-${item.id}`}
                        to={item.href}
                        className="flex items-center gap-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-sm transition hover:border-primary/40"
                      >
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-container text-primary">
                          <MaterialIcon name={item.icon} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-label-lg text-label-lg text-on-background">
                            {item.title}
                          </span>
                          <span className="block truncate text-body-sm text-on-surface-variant">{item.subtitle}</span>
                        </span>
                        <MaterialIcon name="chevron_right" className="text-on-surface-variant" />
                      </Link>
                    ))}
                  </div>
                </section>
              ) : null
            )
          ) : (
            <div className="flex min-h-[420px] flex-col items-center justify-center text-center">
              <div className="mb-5 flex h-24 w-24 items-center justify-center rounded-full bg-primary-container/40 text-primary">
                <MaterialIcon name="search" />
              </div>
              <h3 className="font-title-md text-title-md font-bold">No results found</h3>
              <p className="mt-2 text-body-md text-on-surface-variant">Try searching for something else</p>
              <button className="btn btn-secondary mt-6" onClick={() => setQuery("")}>
                Clear search
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
