import type { InteractionFilter } from "./interaction-flow-helpers";

type FilterTabsProps = {
  filter: InteractionFilter;
  onChange: (filter: InteractionFilter) => void;
  variant: "mobile" | "desktop";
};

const filters: Array<[InteractionFilter, string]> = [
  ["upcoming", "Upcoming"],
  ["done", "Passed"],
  ["followup", "Waiting for response"],
  ["all", "All"],
];

export function FilterTabs({ filter, onChange, variant }: FilterTabsProps) {
  const wrapperClassName =
    variant === "mobile"
      ? "mb-3 flex overflow-x-auto gap-3 pb-1 hide-scrollbar"
      : "mb-8 flex flex-wrap gap-2";

  return (
    <div className={wrapperClassName}>
      {filters.map(([key, label]) => (
        <button
          key={key}
          type="button"
          className={getButtonClassName(filter === key, variant)}
          onClick={() => onChange(key)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function getButtonClassName(selected: boolean, variant: "mobile" | "desktop") {
  if (variant === "mobile") {
    return `whitespace-nowrap rounded-full px-4 py-2 font-label-md text-label-md transition-all ${
      selected
        ? "bg-primary text-on-primary"
        : "border border-outline-variant bg-white text-on-surface-variant"
    }`;
  }

  return `rounded-full px-4 py-1.5 font-label-md text-label-md transition-all ${
    selected
      ? "bg-primary-container text-on-primary-container"
      : "border border-outline-variant bg-white text-on-surface-variant hover:bg-surface-container-low"
  }`;
}
