import { offerStatusOptions } from "../../lib/enum-labels";
import type { Compensation } from "../../lib/types";
import type { CompensationDraft } from "./opportunity-detail-types";
import { LoadingButton } from "@interviews-tracker/design-system";

type CompensationPanelProps = {
  currentCompensation?: Compensation | null;
  compensation: CompensationDraft;
  onCompensationChange: (compensation: CompensationDraft) => void;
  onSaveCompensation: () => void;
  onDeleteCompensation: (compensation: Compensation) => void;
  savingCompensation: boolean;
  deletingCompensation: boolean;
};

export function CompensationPanel({
  currentCompensation,
  compensation,
  onCompensationChange,
  onSaveCompensation,
  onDeleteCompensation,
  savingCompensation,
  deletingCompensation,
}: CompensationPanelProps) {
  return (
    <section className="panel p-6">
      <h3 className="mb-4 font-title-md text-title-md font-bold">Compensation</h3>
      <div className="grid grid-cols-2 gap-3">
        <input
          className="input"
          value={compensation.baseSalary}
          onChange={(event) =>
            onCompensationChange({ ...compensation, baseSalary: event.target.value })
          }
          placeholder={currentCompensation?.baseSalary ?? "Base salary"}
        />
        <input
          className="input"
          value={compensation.equity}
          onChange={(event) =>
            onCompensationChange({ ...compensation, equity: event.target.value })
          }
          placeholder={currentCompensation?.equity ?? "Equity"}
        />
        <input
          className="input"
          value={compensation.bonus}
          onChange={(event) =>
            onCompensationChange({ ...compensation, bonus: event.target.value })
          }
          placeholder={currentCompensation?.bonus ?? "Bonus"}
        />
        <select
          className="input"
          value={compensation.offerStatus}
          onChange={(event) =>
            onCompensationChange({ ...compensation, offerStatus: event.target.value })
          }
        >
          {offerStatusOptions.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
        <textarea
          className="input col-span-2"
          value={compensation.negotiationNotes}
          onChange={(event) =>
            onCompensationChange({
              ...compensation,
              negotiationNotes: event.target.value,
            })
          }
          placeholder={currentCompensation?.negotiationNotes ?? "Negotiation notes"}
        />
        <LoadingButton
          className="btn btn-primary"
          loading={savingCompensation}
          loadingLabel="Saving..."
          icon="save"
          onClick={onSaveCompensation}
        >
          Save compensation
        </LoadingButton>
        {currentCompensation ? (
          <LoadingButton
            className="btn btn-secondary text-error hover:bg-error-container"
            loading={deletingCompensation}
            loadingLabel="Deleting..."
            icon="delete"
            onClick={() => onDeleteCompensation(currentCompensation)}
          >
            Delete compensation
          </LoadingButton>
        ) : null}
      </div>
    </section>
  );
}
