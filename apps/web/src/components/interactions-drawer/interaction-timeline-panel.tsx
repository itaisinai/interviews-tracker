import { Timeline } from "../timeline";
import type { Interaction } from "../../lib/types";

type InteractionTimelinePanelProps = {
  companyName: string;
  interactions: readonly Interaction[];
  selectedInteractionId: string | null;
  onSelectInteraction?: (interactionId: string) => void;
};

export function InteractionTimelinePanel({
  companyName,
  interactions,
  selectedInteractionId,
  onSelectInteraction,
}: InteractionTimelinePanelProps) {
  return (
    <section className="rounded-2xl border border-outline-variant bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-label-md text-label-md uppercase text-on-surface-variant">
            Opportunity timeline
          </p>
          <h4 className="truncate font-title-md text-title-md font-bold">
            {companyName}
          </h4>
        </div>
        <span className="rounded-full bg-surface-container-low px-3 py-1 font-label-md text-label-md text-on-surface-variant">
          {interactions.length}{" "}
          {interactions.length === 1 ? "interaction" : "interactions"}
        </span>
      </div>

      <div className="mt-4">
        <Timeline
          title={companyName}
          interactions={interactions}
          showHeader={false}
          selectedInteractionId={selectedInteractionId}
          onSelectInteraction={onSelectInteraction}
        />
      </div>
    </section>
  );
}
