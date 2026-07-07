import { LoadingButton, MaterialIcon } from "@interviews-tracker/design-system";
import type { CompanyResearchExistingData, CompanyResearchResult } from "../../lib/types";
import type { EditableResearchField, EditableResearchListField } from "./company-research-panel";
import { diffStatus, EditableDetail } from "./company-research-fields";

type CompanyResearchReviewProps = {
  companyName: string;
  existingCompanyData?: CompanyResearchExistingData | null;
  research: CompanyResearchResult;
  editingField: string | null;
  isSaving: boolean;
  saveMessage: string | null;
  saveError: string | null;
  onCancel: () => void;
  onSave: () => void;
  onEditField: (field: string | null) => void;
  onUpdateField: (field: EditableResearchField, value: string | null) => void;
  onUpdateListField: (field: EditableResearchListField, value: string) => void;
  onUpdateRoundsCount: (value: string | null) => void;
};

export function CompanyResearchReview({
  companyName,
  existingCompanyData,
  research,
  editingField,
  isSaving,
  saveMessage,
  saveError,
  onCancel,
  onSave,
  onEditField,
  onUpdateField,
  onUpdateListField,
  onUpdateRoundsCount
}: CompanyResearchReviewProps) {
  return (
    <div className="mt-6 rounded-2xl border border-outline-variant bg-surface-container-low p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-label-md text-label-md uppercase text-on-surface-variant">Review</p>
          <h4 className="font-title-md text-title-md font-bold">Extracted company research</h4>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn btn-secondary text-error hover:bg-error-container" onClick={onCancel}>
            <MaterialIcon name="close" />
            Cancel
          </button>
          <span className="rounded-full bg-primary-container px-3 py-1 font-label-md text-label-md text-on-primary-container">{research.confidence} confidence</span>
          <LoadingButton className="btn btn-primary" loading={isSaving} loadingLabel="Saving..." icon="save" onClick={onSave}>
            Save research
          </LoadingButton>
        </div>
      </div>

      {saveMessage ? <p className="mt-4 rounded-lg bg-primary-container px-4 py-3 text-body-md text-on-primary-container">{saveMessage}</p> : null}
      {saveError ? <p className="mt-4 rounded-lg bg-error-container px-4 py-3 text-body-md text-on-error-container">{saveError}</p> : null}

      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <EditableDetail label="Company title" value={research.company.name} editing={editingField === "companyName"} onEdit={() => onEditField("companyName")} onDone={() => onEditField(null)} onChange={(value) => onUpdateField("companyName", value || companyName)} status={diffStatus(companyName, research.company.name)} />
        <EditableDetail label="English search name" value={research.companySearchName} editing={editingField === "companySearchName"} onEdit={() => onEditField("companySearchName")} onDone={() => onEditField(null)} onChange={(value) => onUpdateField("companySearchName", value)} status={diffStatus(existingCompanyData?.companySearchName ?? null, research.companySearchName)} />
        <EditableDetail label="LinkedIn URL" value={research.linkedinUrl} editing={editingField === "linkedinUrl"} onEdit={() => onEditField("linkedinUrl")} onDone={() => onEditField(null)} onChange={(value) => onUpdateField("linkedinUrl", value)} status={diffStatus(null, research.linkedinUrl)} />
        <EditableDetail label="Funding" value={research.funding} editing={editingField === "funding"} onEdit={() => onEditField("funding")} onDone={() => onEditField(null)} onChange={(value) => onUpdateField("funding", value)} status={diffStatus(existingCompanyData?.funding ?? null, research.funding)} multiline />
        <EditableDetail label="Total raised" value={research.totalRaised} editing={editingField === "totalRaised"} onEdit={() => onEditField("totalRaised")} onDone={() => onEditField(null)} onChange={(value) => onUpdateField("totalRaised", value)} status={diffStatus(null, research.totalRaised)} />
        <EditableDetail label="Rounds count" value={research.roundsCount != null ? String(research.roundsCount) : null} editing={editingField === "roundsCount"} onEdit={() => onEditField("roundsCount")} onDone={() => onEditField(null)} onChange={onUpdateRoundsCount} status={diffStatus(null, research.roundsCount != null ? String(research.roundsCount) : null)} />
        <EditableDetail label="Latest round" value={research.latestRound} editing={editingField === "latestRound"} onEdit={() => onEditField("latestRound")} onDone={() => onEditField(null)} onChange={(value) => onUpdateField("latestRound", value)} status={diffStatus(null, research.latestRound)} />
        <EditableDetail label="Investors" value={research.investors.length > 0 ? research.investors.join(", ") : null} editing={editingField === "investors"} onEdit={() => onEditField("investors")} onDone={() => onEditField(null)} onChange={(value) => onUpdateListField("investors", value ?? "")} status={diffStatus(null, research.investors.length > 0 ? research.investors.join(", ") : null)} multiline />
        <EditableDetail label="Investment rounds" value={research.investmentRounds} editing={editingField === "investmentRounds"} onEdit={() => onEditField("investmentRounds")} onDone={() => onEditField(null)} onChange={(value) => onUpdateField("investmentRounds", value)} status={diffStatus(existingCompanyData?.investmentRounds ?? null, research.investmentRounds)} multiline />
        <EditableDetail label="Employees" value={research.employees} editing={editingField === "employees"} onEdit={() => onEditField("employees")} onDone={() => onEditField(null)} onChange={(value) => onUpdateField("employees", value)} status={diffStatus(existingCompanyData?.employees ?? null, research.employees)} />
        <EditableDetail label="Location" value={research.location} editing={editingField === "location"} onEdit={() => onEditField("location")} onDone={() => onEditField(null)} onChange={(value) => onUpdateField("location", value)} status={diffStatus(existingCompanyData?.location ?? null, research.location)} />
        <EditableDetail label="Domains" value={research.domains.length > 0 ? research.domains.join(", ") : null} editing={editingField === "domains"} onEdit={() => onEditField("domains")} onDone={() => onEditField(null)} onChange={(value) => onUpdateListField("domains", value ?? "")} status={diffStatus(null, research.domains.length > 0 ? research.domains.join(", ") : null)} />
        <EditableDetail label="Customers / traction" value={research.customersTraction} editing={editingField === "customersTraction"} onEdit={() => onEditField("customersTraction")} onDone={() => onEditField(null)} onChange={(value) => onUpdateField("customersTraction", value)} status={diffStatus(existingCompanyData?.customersTraction ?? null, research.customersTraction)} multiline />
        <EditableDetail label="Company description" value={research.companyDescription} editing={editingField === "companyDescription"} onEdit={() => onEditField("companyDescription")} onDone={() => onEditField(null)} onChange={(value) => onUpdateField("companyDescription", value)} status={diffStatus(existingCompanyData?.companyDescription ?? null, research.companyDescription)} multiline />
        <EditableDetail label="Product description" value={research.productDescription} editing={editingField === "productDescription"} onEdit={() => onEditField("productDescription")} onDone={() => onEditField(null)} onChange={(value) => onUpdateField("productDescription", value)} status={diffStatus(existingCompanyData?.productDescription ?? null, research.productDescription)} multiline />
      </div>

      <div className="mt-5">
        <EditableDetail label="Source URLs" value={research.sourceUrls.join("\n")} editing={editingField === "sourceUrls"} onEdit={() => onEditField("sourceUrls")} onDone={() => onEditField(null)} onChange={(value) => onUpdateListField("sourceUrls", value ?? "")} multiline />
      </div>

      <div className="mt-5">
        <EditableDetail label="Important notes" value={research.rawImportantNotes.join("\n")} editing={editingField === "rawImportantNotes"} onEdit={() => onEditField("rawImportantNotes")} onDone={() => onEditField(null)} onChange={(value) => onUpdateListField("rawImportantNotes", value ?? "")} multiline />
      </div>
    </div>
  );
}
