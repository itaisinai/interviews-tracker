import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { MaterialIcon } from "@interviews-tracker/design-system";
import { api } from "../../lib/api";
import { buildGlobalSearchResults, countSearchResults, flattenSearchResults, SEARCH_DEBOUNCE_MS, SEARCH_MIN_QUERY_LENGTH, type GlobalSearchResults, type SearchResult } from "../../lib/global-search";

const sections: Array<{ key: keyof GlobalSearchResults; label: string }> = [
  { key: "companies", label: "In Companies" },
  { key: "opportunities", label: "In Opportunities" },
  { key: "interactions", label: "In Interactions" },
];

export function GlobalSearchBox({ placeholder = "Search..." }: { placeholder?: string }) {
  const navigate = useNavigate();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [open, setOpen] = useState(false);

  const enabled = debouncedQuery.trim().length >= SEARCH_MIN_QUERY_LENGTH;
  const companies = useQuery({ queryKey: ["companies"], queryFn: api.companies, enabled });
  const opportunities = useQuery({ queryKey: ["opportunities", "global-search"], queryFn: () => api.opportunities(), enabled });
  const interactions = useQuery({ queryKey: ["interactions"], queryFn: api.interactions, enabled });

  useEffect(() => {
    const handle = window.setTimeout(() => setDebouncedQuery(query), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    function onDocumentMouseDown(event: MouseEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocumentMouseDown);
    return () => document.removeEventListener("mousedown", onDocumentMouseDown);
  }, []);

  const results = useMemo(() => buildGlobalSearchResults({
    companies: companies.data ?? [],
    opportunities: opportunities.data ?? [],
    interactions: interactions.data ?? [],
    query: debouncedQuery,
  }), [companies.data, debouncedQuery, interactions.data, opportunities.data]);
  const visibleResults = flattenSearchResults(results).slice(0, 5);
  const isLoading = enabled && (companies.isFetching || opportunities.isFetching || interactions.isFetching);
  const shouldShowDropdown = open && query.trim().length >= SEARCH_MIN_QUERY_LENGTH;

  function goToSearch() {
    const value = query.trim();
    setOpen(false);
    navigate(`/search${value ? `?q=${encodeURIComponent(value)}` : ""}`);
  }

  function goToResult(result: SearchResult) {
    setOpen(false);
    setQuery("");
    navigate(result.href);
  }

  return (
    <div ref={wrapperRef} className="relative w-full max-w-md">
      <MaterialIcon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
      <input
        aria-label="Global search"
        className="w-full rounded-full border border-transparent bg-surface-container-low py-2 pl-10 pr-9 text-body-md focus:border-primary focus:ring-2 focus:ring-primary/20"
        placeholder={placeholder}
        value={query}
        onChange={(event) => { setQuery(event.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={(event) => { if (event.key === "Escape") setOpen(false); if (event.key === "Enter" && query.trim()) goToSearch(); }}
      />
      {query ? <button aria-label="Clear global search" className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant" onClick={() => { setQuery(""); setOpen(false); }}><MaterialIcon name="close" /></button> : null}
      {shouldShowDropdown ? (
        <div className="absolute left-0 top-[calc(100%+8px)] z-50 w-full overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-xl">
          <div className="max-h-[420px] overflow-auto py-3">
            {isLoading ? <p className="px-5 py-8 text-center text-body-md text-on-surface-variant">Searching...</p> : visibleResults.length ? sections.map((section) => {
              const items = visibleResults.filter((item) => item.type === section.key);
              if (!items.length) return null;
              return <div key={section.key} className="mb-2 last:mb-0"><p className="px-5 pb-2 font-label-md text-label-md text-on-surface-variant">{section.label}</p>{items.map((item) => <button key={`${item.type}-${item.id}`} className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-surface-container-low" onClick={() => goToResult(item)}><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-container text-primary"><MaterialIcon name={item.icon} /></span><span className="min-w-0"><span className="block truncate font-label-lg text-label-lg text-on-background">{item.title}</span><span className="block truncate text-body-sm text-on-surface-variant">{item.subtitle}</span></span></button>)}</div>;
            }) : <div className="px-5 py-12 text-center"><div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-container/40 text-primary"><MaterialIcon name="search" /></div><p className="font-title-sm text-title-sm font-bold">No results found</p><p className="mt-1 text-body-md text-on-surface-variant">Try searching for something else</p></div>}
          </div>
          <button className="flex w-full items-center justify-between border-t border-outline-variant bg-surface-container-low px-5 py-4 font-label-lg text-label-lg text-primary" onClick={goToSearch}>
            <span>View all search results</span><MaterialIcon name="chevron_right" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
