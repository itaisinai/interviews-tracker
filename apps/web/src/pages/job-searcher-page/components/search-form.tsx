import { Button, MaterialIcon } from "@interviews-tracker/design-system";

import type { SearchFilters } from "../types";

interface SearchFormProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  onSearch: () => void;
  onSaveSearch: () => void;
  isLoading: boolean;
  canSave: boolean;
}

export function SearchForm({ filters, onFiltersChange, onSearch, onSaveSearch, isLoading, canSave }: SearchFormProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch();
  };

  return (
    <form onSubmit={handleSubmit} className="panel p-6 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-2">Job Title or Keywords</label>
          <input
            type="text"
            value={filters.query}
            onChange={(e) => onFiltersChange({ ...filters, query: e.target.value })}
            placeholder="e.g., Senior Backend Engineer, React Developer"
            className="input w-full"
            disabled={isLoading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Location (optional)</label>
          <input
            type="text"
            value={filters.location}
            onChange={(e) => onFiltersChange({ ...filters, location: e.target.value })}
            placeholder="e.g., San Francisco"
            className="input w-full"
            disabled={isLoading}
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={filters.remoteOnly}
            onChange={(e) => onFiltersChange({ ...filters, remoteOnly: e.target.checked })}
            className="checkbox"
            disabled={isLoading}
          />
          <span className="text-sm">Remote jobs only</span>
        </label>

        <div className="flex gap-2">
          {canSave && (
            <Button
              type="button"
              variant="secondary"
              onClick={onSaveSearch}
              disabled={isLoading || filters.query.trim().length === 0}
            >
              <MaterialIcon name="bookmark" />
              Save Search
            </Button>
          )}
          <Button type="submit" variant="primary" disabled={isLoading || filters.query.trim().length === 0}>
            <MaterialIcon name="search" />
            Search Jobs
          </Button>
        </div>
      </div>
    </form>
  );
}
