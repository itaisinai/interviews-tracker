import { useState } from "react";

import { IconLink, MaterialIcon, Modal } from "@interviews-tracker/design-system";

import type { Person } from "../../lib/types";

type FixCompanyMismatchModalProps = {
  isOpen: boolean;
  onClose: () => void;
  person: Person;
  opportunityCompanyName: string;
  onAutoRefresh: () => void;
  onManualUpdate: () => void;
};

export function FixCompanyMismatchModal({
  isOpen,
  onClose,
  person,
  opportunityCompanyName,
  onAutoRefresh,
  onManualUpdate,
}: FixCompanyMismatchModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" title="Company Mismatch Detected">
      <div className="flex flex-col">
        {/* Content */}
        <div className="p-6">
          <div className="mb-6 rounded-lg bg-warning/10 p-4">
            <div className="flex items-start gap-3">
              <MaterialIcon name="info" className="text-[24px] text-warning" />
              <div className="flex-1">
                <p className="text-body-md font-medium text-on-surface">LinkedIn profile shows different company</p>
                <div className="mt-2 space-y-1 text-body-sm text-on-surface-variant">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">LinkedIn:</span>
                    <span>{person.company}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Opportunity:</span>
                    <span>{opportunityCompanyName}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {person.linkedinUrl && (
            <div className="mb-6">
              <label className="label mb-2">LinkedIn Profile</label>
              <div className="rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2">
                <IconLink href={person.linkedinUrl}>{person.linkedinUrl}</IconLink>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <h3 className="mb-2 font-title-sm text-title-sm font-bold text-on-surface">
                How would you like to fix this?
              </h3>
              <p className="text-body-sm text-on-surface-variant">
                Choose the best option to update {person.name}'s current job information.
              </p>
            </div>

            {/* Primary option: Auto-refresh */}
            <button
              type="button"
              onClick={() => {
                onAutoRefresh();
                onClose();
              }}
              className="flex w-full items-center gap-3 rounded-lg border-2 border-primary bg-primary/5 p-4 text-left transition-colors hover:bg-primary/10"
            >
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                <MaterialIcon name="refresh" className="text-[24px] text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-title-sm text-title-sm font-bold text-on-surface">Auto-refresh from LinkedIn</p>
                <p className="mt-1 text-body-sm text-on-surface-variant">
                  Automatically fetch latest data from their LinkedIn profile
                </p>
              </div>
              <MaterialIcon name="arrow_forward" className="text-[20px] text-on-surface-variant" />
            </button>

            {/* Secondary option: Manual update */}
            <button
              type="button"
              onClick={() => {
                onManualUpdate();
                onClose();
              }}
              className="flex w-full items-center gap-3 rounded-lg border border-outline-variant bg-surface p-4 text-left transition-colors hover:bg-surface-container"
            >
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-surface-container-high">
                <MaterialIcon name="edit" className="text-[24px] text-on-surface-variant" />
              </div>
              <div className="flex-1">
                <p className="font-title-sm text-title-sm font-bold text-on-surface">Manually update current job</p>
                <p className="mt-1 text-body-sm text-on-surface-variant">
                  Paste job description text to update their timeline
                </p>
              </div>
              <MaterialIcon name="arrow_forward" className="text-[20px] text-on-surface-variant" />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-outline-variant p-6">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-6 py-2 font-medium text-on-surface transition-colors hover:bg-surface-container"
          >
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  );
}
