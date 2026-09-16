import { useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { MaterialIcon, PageErrorState, PageLoadingState } from "@interviews-tracker/design-system";

import { PageIntro } from "../../components/app-layout";
import { api } from "../../lib/api";

import { JobDetailDrawer } from "./components/job-detail-drawer";
import { JobResultsList } from "./components/job-results-list";
import { type SavedJobSearch, SavedSearches } from "./components/saved-searches";
import { SearchForm } from "./components/search-form";
import type { JobSearchResult, SearchFilters } from "./types";

export function JobSearcherPage() {
  const [filters, setFilters] = useState<SearchFilters>({
    query: "",
    location: "",
    remoteOnly: false,
  });
  const [activeSearch, setActiveSearch] = useState<SearchFilters | null>(null);
  const [selectedJob, setSelectedJob] = useState<JobSearchResult | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const queryClient = useQueryClient();

  const {
    data: searchResults = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["job-search", activeSearch],
    queryFn: () =>
      api.searchJobs({
        query: activeSearch!.query,
        location: activeSearch!.location || undefined,
        remoteOnly: activeSearch!.remoteOnly,
        limit: 20,
      }),
    enabled: activeSearch !== null && activeSearch.query.trim().length > 0,
    staleTime: 10 * 60 * 1000,
  });

  const { data: savedSearches = [] } = useQuery({
    queryKey: ["saved-job-searches"],
    queryFn: api.listSavedJobSearches,
    staleTime: 5 * 60 * 1000,
  });

  const { mutate: createSavedSearch } = useMutation({
    mutationFn: api.createSavedJobSearch,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-job-searches"] });
      setIsSaveDialogOpen(false);
      setSaveName("");
    },
  });

  const { mutate: deleteSavedSearch } = useMutation({
    mutationFn: api.deleteSavedJobSearch,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-job-searches"] });
    },
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

  const handleSearch = () => {
    setActiveSearch(filters);
  };

  const handleSaveSearch = () => {
    const defaultName = filters.location ? `${filters.query} in ${filters.location}` : filters.query;
    const name = prompt("Enter a name for this search:", defaultName);
    if (name) {
      createSavedSearch({
        name,
        query: filters.query,
        location: filters.location || undefined,
        remoteOnly: filters.remoteOnly,
      });
    }
  };

  const handleSelectSavedSearch = (search: SavedJobSearch) => {
    const newFilters = {
      query: search.query,
      location: search.location || "",
      remoteOnly: search.remoteOnly,
    };
    setFilters(newFilters);
    setActiveSearch(newFilters);
  };

  const handleDeleteSavedSearch = (id: string) => {
    if (confirm("Delete this saved search?")) {
      deleteSavedSearch(id);
    }
  };

  return (
    <>
      <PageIntro
        title="Job Searcher"
        description="Search for job opportunities on LinkedIn and import them to your pipeline"
        actions={isFetching && <span className="text-sm text-gray-500">Searching...</span>}
      />

      <div className="space-y-6">
        <SearchForm
          filters={filters}
          onFiltersChange={setFilters}
          onSearch={handleSearch}
          onSaveSearch={handleSaveSearch}
          isLoading={isFetching}
          canSave={filters.query.trim().length > 0}
        />

        <SavedSearches
          searches={savedSearches}
          onSelectSearch={handleSelectSavedSearch}
          onDeleteSearch={handleDeleteSavedSearch}
        />

        {!activeSearch && (
          <div className="panel p-12 text-center">
            <MaterialIcon name="search" className="text-6xl text-gray-300 mb-4" />
            <h3 className="text-lg font-medium mb-2">Start Your Job Search</h3>
            <p className="text-gray-600">Enter a job title, skills, or company name to find opportunities</p>
          </div>
        )}

        {isLoading && activeSearch && <PageLoadingState title="" description="Searching LinkedIn..." />}

        {isError && activeSearch && (
          <PageErrorState
            title="Search Failed"
            description={(error as Error)?.message ?? "Failed to search jobs"}
            onRetry={() => handleSearch()}
          />
        )}

        {!isLoading && !isError && activeSearch && searchResults.length === 0 && (
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
