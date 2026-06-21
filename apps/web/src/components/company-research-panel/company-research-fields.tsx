import type { ReactNode } from "react";
import { Badge } from "../badge";
import { MaterialIcon } from "@interviews-tracker/design-system";

export type DiffStatus = "NEW" | "UPDATED" | null;

export function diffStatus(existing: string | null | undefined, next: string | null | undefined): DiffStatus {
  const current = normalizeComparable(existing);
  const incoming = normalizeComparable(next);

  if (!incoming) {
    return null;
  }

  if (!current) {
    return "NEW";
  }

  return current === incoming ? null : "UPDATED";
}

export function splitListInput(value: string) {
  return value
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function normalizeComparable(value: string | null | undefined) {
  return value?.trim().replace(/\s+/g, " ").toLowerCase() ?? "";
}

export function EditableDetail({
  label,
  value,
  status,
  editing,
  multiline = false,
  onEdit,
  onDone,
  onChange
}: {
  label: string;
  value: string | null;
  status?: DiffStatus;
  editing: boolean;
  multiline?: boolean;
  onEdit: () => void;
  onDone: () => void;
  onChange: (value: string | null) => void;
}) {
  const isUrl = typeof value === "string" && /^https?:\/\//i.test(value);

  return (
    <div>
      <div className="flex items-center gap-2">
        <p className="label">{label}</p>
        {status ? <Badge value={status} tone={status === "NEW" ? "green" : "violet"} /> : null}
        <button
          type="button"
          className="rounded-full p-1 text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-background"
          aria-label={`Edit ${label}`}
          title={`Edit ${label}`}
          onClick={onEdit}
        >
          <MaterialIcon name="edit" className="text-[16px]" />
        </button>
      </div>
      {editing ? (
        <div className="mt-2 space-y-2">
          {multiline ? (
            <textarea
              className="input min-h-24"
              value={value ?? ""}
              onChange={(event) => onChange(event.target.value || null)}
            />
          ) : (
            <input
              className="input"
              value={value ?? ""}
              onChange={(event) => onChange(event.target.value || null)}
            />
          )}
          <button type="button" className="btn btn-secondary" onClick={onDone}>
            <MaterialIcon name="check" />
            Save
          </button>
        </div>
      ) : isUrl && value ? (
        <a
          className="mt-1 inline-flex max-w-full items-center gap-2 break-all text-body-md text-primary hover:underline"
          href={value}
          target="_blank"
          rel="noreferrer"
        >
          <MaterialIcon name="open_in_new" className="text-[16px]" />
          <span>{value}</span>
        </a>
      ) : (
        <p className="mt-1 whitespace-pre-line text-body-md text-on-surface-variant">{value || "-"}</p>
      )}
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <div className="mt-2">{children}</div>
    </label>
  );
}
