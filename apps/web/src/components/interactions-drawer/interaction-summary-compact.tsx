import { MessageSquare, Pencil, PencilOff, Trash2 } from "lucide-react";
import {
  displayLabelForEnumValue,
  normalizeInteractionType,
} from "../../lib/enum-labels";

import { Badge } from "../badge";
import type { Interaction } from "../../lib/types";
import { MaterialIcon } from "@interviews-tracker/design-system";
import { formatDateTimeRange } from "../../lib/format";

type InteractionSummaryCompactProps = {
  interaction: Interaction;
  statusBadge: {
    label: string;
    tone: "blue" | "green" | "red" | "muted" | "warning";
  } | null;
  onEdit: () => void;
  onCancelEditing: () => void;
  onDelete: () => void;
  onAddFeedback: () => void;
  isAddFeedbackDisabled?: boolean;
  isEditing?: boolean;
};

export function InteractionSummaryCompact({
  interaction,
  statusBadge,
  onEdit,
  onCancelEditing,
  onDelete,
  onAddFeedback,
  isAddFeedbackDisabled = false,
  isEditing = false,
}: InteractionSummaryCompactProps) {
  const typeLabel =
    displayLabelForEnumValue(normalizeInteractionType(interaction.type)) ??
    interaction.type;
  const dateTimeRange = formatDateTimeRange(
    interaction.date,
    interaction.endDate,
  );

  // Calculate duration
  let duration = "";
  if (interaction.endDate) {
    const start = new Date(interaction.date);
    const end = new Date(interaction.endDate);
    const minutes = Math.round((end.getTime() - start.getTime()) / 60000);
    if (minutes < 60) {
      duration = `${minutes}min`;
    } else {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      duration = mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
    }
  }

  return (
    <div className="flex items-start gap-4 p-4 bg-white rounded-lg border border-neutral-200">
      {/* Icon */}
      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
        <MaterialIcon name="event" className="text-[20px] text-purple-600" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-neutral-900 mb-1">
              {typeLabel}
            </h3>
            <div className="flex items-center gap-2 text-sm text-neutral-600">
              <MaterialIcon name="schedule" className="text-[16px]" />
              <span>{dateTimeRange}</span>
              {duration && (
                <>
                  <span>•</span>
                  <span>{duration}</span>
                </>
              )}
            </div>
            {interaction.stage && (
              <div className="flex items-center gap-2 mt-2">
                <Badge tone="blue">{interaction.stage}</Badge>
                {statusBadge && (
                  <Badge tone={statusBadge.tone}>{statusBadge.label}</Badge>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={onAddFeedback}
              disabled={isAddFeedbackDisabled}
              className="p-2 rounded-lg border border-emerald-200 text-emerald-600 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:border-neutral-200 disabled:text-neutral-400 disabled:hover:bg-transparent transition-colors"
              title={
                isAddFeedbackDisabled
                  ? "Save or cancel edits before adding feedback"
                  : "Add Feedback"
              }
            >
              <MessageSquare className="w-4 h-4" />
            </button>
            <button
              onClick={isEditing ? onCancelEditing : onEdit}
              className="p-2 rounded-lg border border-neutral-200 text-neutral-700 hover:bg-neutral-50 transition-colors"
              title="Edit"
            >
              {isEditing ? (
                <PencilOff className="w-4 h-4" />
              ) : (
                <Pencil className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={onDelete}
              className="p-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
