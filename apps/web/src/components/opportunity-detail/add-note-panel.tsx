import type { NoteDraft } from "./opportunity-detail-types";
import { LoadingButton } from "../loading-state";

type AddNotePanelProps = {
  note: NoteDraft;
  onNoteChange: (note: NoteDraft) => void;
  onAddNote: () => void;
  addingNote: boolean;
};

export function AddNotePanel({
  note,
  onNoteChange,
  onAddNote,
  addingNote,
}: AddNotePanelProps) {
  return (
    <section className="panel p-6">
      <h3 className="mb-4 font-title-md text-title-md font-bold">Add Note</h3>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <input
          className="input"
          value={note.title}
          onChange={(event) =>
            onNoteChange({ ...note, title: event.target.value })
          }
          placeholder="Note title"
        />
        <input
          className="input"
          value={note.category}
          onChange={(event) =>
            onNoteChange({ ...note, category: event.target.value })
          }
          placeholder="Category"
        />
        <textarea
          className="input col-span-2"
          value={note.content}
          onChange={(event) =>
            onNoteChange({ ...note, content: event.target.value })
          }
          placeholder="Note content"
        />
        <LoadingButton
          className="btn btn-secondary"
          loading={addingNote}
          loadingLabel="Adding..."
          icon="note_add"
          onClick={onAddNote}
        >
          Add note
        </LoadingButton>
      </div>
    </section>
  );
}
