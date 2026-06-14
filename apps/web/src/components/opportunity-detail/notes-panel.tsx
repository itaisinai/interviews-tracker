import type { Note } from "../../lib/types";
import { LoadingButton } from "../loading-state";

type NotesPanelProps = {
  notes: Note[];
  onDeleteNote: (note: Note) => void;
  deletingNoteId?: string;
};

export function NotesPanel({
  notes,
  onDeleteNote,
  deletingNoteId,
}: NotesPanelProps) {
  return (
    <section className="panel p-6">
      <h3 className="mb-4 font-title-md text-title-md font-bold">Notes</h3>
      {notes
        .filter((item) => item.category !== "Company Research")
        .map((item) => (
          <div key={item.id} className="border-b border-outline-variant py-3 last:border-0">
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold">{item.title}</p>
              <LoadingButton
                compact
                aria-label="Delete note"
                className="text-error"
                icon="delete"
                loading={deletingNoteId === item.id}
                onClick={() => onDeleteNote(item)}
              />
            </div>
            <p className="font-label-md text-label-md text-on-surface-variant">
              {item.category}
            </p>
            <p className="mt-1 text-body-md">{item.content}</p>
          </div>
        ))}
    </section>
  );
}
