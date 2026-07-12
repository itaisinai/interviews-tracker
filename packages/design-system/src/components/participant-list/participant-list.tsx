import { MaterialIcon } from "../material-icon/material-icon";

export type Participant = {
  name: string;
  title?: string;
  hasResearch?: boolean;
  onResearch?: () => void;
  onViewDetails?: () => void;
};

type ParticipantListProps = {
  participants: Participant[];
  onSearch?: (query: string) => void;
  searchPlaceholder?: string;
  emptyMessage?: string;
};

export function ParticipantList({
  participants,
  onSearch,
  searchPlaceholder = "Search participants...",
  emptyMessage = "No participants found",
}: ParticipantListProps) {
  return (
    <div className="space-y-3">
      {/* Search (optional) */}
      {onSearch && (
        <div className="relative">
          <MaterialIcon
            name="search"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant"
          />
          <input
            type="text"
            placeholder={searchPlaceholder}
            onChange={(e) => onSearch(e.target.value)}
            className="w-full rounded-lg border border-outline bg-surface pl-10 pr-3 py-2 text-body-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
      )}

      {/* Participants List */}
      <div className="space-y-2">
        {participants.length === 0 ? (
          <p className="text-body-sm text-on-surface-variant text-center py-4">{emptyMessage}</p>
        ) : (
          participants.map((participant) => (
            <div
              key={participant.name}
              className="flex items-center justify-between rounded-lg border border-outline-variant bg-surface px-3 py-2.5 transition-colors hover:bg-surface-container"
              title={participant.title || undefined}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <MaterialIcon name="person" className="text-[20px] text-on-surface-variant flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-body-md font-medium text-on-surface truncate">{participant.name}</div>
                  {participant.title && (
                    <div className="text-body-sm text-on-surface-variant truncate">{participant.title}</div>
                  )}
                </div>
              </div>

              {(participant.onResearch || participant.onViewDetails) && (
                <button
                  type="button"
                  onClick={() => {
                    if (participant.hasResearch && participant.onViewDetails) {
                      participant.onViewDetails();
                    } else if (participant.onResearch) {
                      participant.onResearch();
                    }
                  }}
                  className="flex-shrink-0 rounded-lg p-1.5 text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-primary"
                  title={participant.hasResearch ? "View details" : "Research person"}
                >
                  <MaterialIcon name={participant.hasResearch ? "badge" : "search"} className="text-[18px]" />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
