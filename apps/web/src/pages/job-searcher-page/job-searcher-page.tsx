import { useEffect, useState } from "react";

import { useQuery } from "@tanstack/react-query";

import { MaterialIcon, PageErrorState, PageLoadingState } from "@interviews-tracker/design-system";

import { PageIntro } from "../../components/app-layout";
import { api } from "../../lib/api";

import { JobDetailDrawer } from "./components/job-detail-drawer";
import { JobResultsList } from "./components/job-results-list";
import { SearchForm } from "./components/search-form";
import type { JobSearchResult, SearchFilters } from "./types";

export function JobSearcherPage() {
  const [filters, setFilters] = useState<SearchFilters>({
    query: "",
    location: "",
    remoteOnly: false,
  });
  const [debouncedFilters, setDebouncedFilters] = useState<SearchFilters>(filters);
  const [selectedJob, setSelectedJob] = useState<JobSearchResult | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Debounce search filters to avoid searching on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFilters(filters);
    }, 500); // Wait 500ms after user stops typing

    return () => clearTimeout(timer);
  }, [filters]);

  const {
    data: searchResults = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["job-search", debouncedFilters],
    queryFn: () =>
      api.searchJobs({
        query: debouncedFilters.query,
        location: debouncedFilters.location || undefined,
        remoteOnly: debouncedFilters.remoteOnly,
        limit: 20,
      }),
    enabled: debouncedFilters.query.trim().length > 0,
    staleTime: 10 * 60 * 1000,
  });

  const handleJobClick = (job: JobSearchResult) => {
    setSelectedJob(job);
    setIsDrawerOpen(true);
  };

  const handleDrawerClose = () => {
    setIsDrawerOpen(false);
    setSelectedJob(null);
  };

  const handleImportSuccess = () => {
    handleDrawerClose();
  };

  return (
    <>
      <PageIntro
        title="Job Searcher"
        description="Search for job opportunities on LinkedIn and import them to your pipeline"
        actions={isFetching && <span className="text-sm text-gray-500">Searching...</span>}
      />

      <div className="space-y-6">
        <SearchForm filters={filters} onFiltersChange={setFilters} onSearch={() => refetch()} isLoading={isFetching} />

        {filters.query.trim().length === 0 && (
          <div className="panel p-12 text-center">
            <MaterialIcon name="search" className="text-6xl text-gray-300 mb-4" />
            <h3 className="text-lg font-medium mb-2">Start Your Job Search</h3>
            <p className="text-gray-600">Enter a job title, skills, or company name to find opportunities</p>
          </div>
        )}

        {filters.query.trim().length > 0 && debouncedFilters.query.trim().length === 0 && (
          <div className="panel p-12 text-center">
            <MaterialIcon name="pending" className="text-6xl text-gray-300 mb-4 animate-spin" />
            <h3 className="text-lg font-medium mb-2">Typing...</h3>
            <p className="text-gray-600">Results will appear after you stop typing</p>
          </div>
        )}

        {isLoading && debouncedFilters.query.trim().length > 0 && (
          <PageLoadingState title="" description="Searching LinkedIn..." />
        )}

        {isError && (
          <PageErrorState
            title="Search Failed"
            description={(error as Error)?.message ?? "Failed to search jobs"}
            onRetry={refetch}
          />
        )}

        {!isLoading &&
          !isError &&
          searchResults.length === 0 &&
          debouncedFilters.query.trim().length > 0 &&
          filters.query === debouncedFilters.query && (
            <div className="panel p-12 text-center">
              <MaterialIcon name="info" className="text-6xl text-gray-300 mb-4" />
              <h3 className="text-lg font-medium mb-2">No Results Found</h3>
              <p className="text-gray-600">Try adjusting your search query or filters</p>
            </div>
          )}

        {!isLoading && !isError && searchResults.length > 0 && (
          <JobResultsList results={searchResults} onJobClick={handleJobClick} />
        )}
      </div>

      {selectedJob && (
        <JobDetailDrawer
          job={selectedJob}
          isOpen={isDrawerOpen}
          onClose={handleDrawerClose}
          onImportSuccess={handleImportSuccess}
        />
      )}
    </>
  );
}
