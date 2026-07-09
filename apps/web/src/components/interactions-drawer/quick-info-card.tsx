import { MaterialIcon } from "@interviews-tracker/design-system";

import { displayLabelForEnumValue, normalizeInteractionType } from "../../lib/enum-labels";
import type { Interaction } from "../../lib/types";

type QuickInfoCardProps = {
  interaction: Interaction;
};

export function QuickInfoCard({ interaction }: QuickInfoCardProps) {
  const typeLabel = displayLabelForEnumValue(normalizeInteractionType(interaction.type)) ?? interaction.type;

  // Determine source from gmailMessageId
  const source = interaction.gmailMessageId ? "Gmail" : "Manual";

  // Extract organizer from personName (first person in the list)
  const organizer = interaction.personName?.split(/\s+and\s+|,\s*/)[0]?.trim() || "—";

  return (
    <div className="bg-white rounded-lg border border-neutral-200 p-4">
      <div className="flex items-center gap-2 mb-3">
        <MaterialIcon name="info" className="text-[18px] text-neutral-600" />
        <h3 className="text-sm font-semibold text-neutral-900">Quick Info</h3>
      </div>

      <div className="grid grid-cols-2 gap-x-8 gap-y-3">
        <div>
          <div className="text-xs text-neutral-500 mb-1">Type</div>
          <div className="text-sm text-neutral-900">{typeLabel}</div>
        </div>

        <div>
          <div className="text-xs text-neutral-500 mb-1">Stage</div>
          <div className="text-sm text-neutral-900">{interaction.stage || "—"}</div>
        </div>

        <div>
          <div className="text-xs text-neutral-500 mb-1">Organizer</div>
          <div className="text-sm text-neutral-900">{organizer}</div>
        </div>

        <div>
          <div className="text-xs text-neutral-500 mb-1 flex items-center gap-1">
            Source
            {source === "Gmail" && <MaterialIcon name="mail" className="text-[14px] text-red-500" />}
          </div>
          <div className="text-sm text-neutral-900">{source}</div>
        </div>
      </div>
    </div>
  );
}
