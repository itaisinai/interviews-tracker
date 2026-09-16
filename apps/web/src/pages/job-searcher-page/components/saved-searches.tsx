import { Badge, Button, MaterialIcon } from "@interviews-tracker/design-system";

export type SavedJobSearch = {
  id: string;
  name: string;
  query: string;
  location: string | null;
  remoteOnly: boolean;
  createdAt: string;
  updatedAt: string;
};

interface SavedSearchesProps {
  searches: SavedJobSearch[];
  onSelectSearch: (search: SavedJobSearch) => void;
  onDeleteSearch: (id: string) => void;
}

export function SavedSearches({ searches, onSelectSearch, onDeleteSearch }: SavedSearchesProps) {
  if (searches.length === 0) {
    return null;
  }

  return (
    <div className="panel p-4">
      <div className="flex items-center gap-2 mb-3">
        <MaterialIcon name="bookmark" className="text-gray-600" />
        <h3 className="text-sm font-medium text-gray-900">Saved Searches</h3>
      </div>
      <div className="flex flex-wrap gap-2">
        {searches.map((search) => (
          <button
            key={search.id}
            onClick={() => onSelectSearch(search)}
            className="group flex items-center gap-2 px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-900">{search.name}</span>
              {search.remoteOnly && (
                <Badge tone="neutral">
                  <MaterialIcon name="home" className="text-xs" />
                  Remote
                </Badge>
              )}
              {search.location && (
                <Badge tone="neutral">
                  <MaterialIcon name="location_on" className="text-xs" />
                  {search.location}
                </Badge>
              )}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteSearch(search.id);
              }}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-100 rounded"
              title="Delete search"
            >
              <MaterialIcon name="close" className="text-sm text-red-600" />
            </button>
          </button>
        ))}
      </div>
    </div>
  );
}
