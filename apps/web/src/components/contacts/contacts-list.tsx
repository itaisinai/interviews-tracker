import { useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";

import { MaterialIcon } from "@interviews-tracker/design-system";

import { api } from "../../lib/api";
import { detectCompanyMismatch } from "../../lib/person-utils";
import type { Person } from "../../lib/types";
import { PersonResearchFlow } from "../person-research/person-research-flow";

import { FixCompanyMismatchModal } from "./fix-company-mismatch-modal";
import { ManualJobUpdateModal } from "./manual-job-update-modal";
import { PersonInfoModal } from "./person-info-modal";
import { ReviewJobTimelineModal } from "./review-job-timeline-modal";

type ContactsListProps = {
  opportunitySlug: string;
  companyName: string;
};

export function ContactsList({ opportunitySlug, companyName }: ContactsListProps) {
  const queryClient = useQueryClient();
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedPersonSlug, setSelectedPersonSlug] = useState<string | null>(null);
  const [researchPerson, setResearchPerson] = useState<{
    name: string;
    title?: string;
    company: string;
    linkedinUrl?: string;
    email?: string;
  } | null>(null);
  const [researchPersonSlug, setResearchPersonSlug] = useState<string | undefined>(undefined); // Explicit slug for updates
  const [fixMismatchPerson, setFixMismatchPerson] = useState<Person | null>(null);
  const [manualUpdatePerson, setManualUpdatePerson] = useState<Person | null>(null);
  const [reviewTimeline, setReviewTimeline] = useState<{
    person: Person;
    currentTimeline: any;
    updatedTimeline: any;
  } | null>(null);

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ["opportunity-contacts", opportunitySlug],
    queryFn: () => api.getOpportunityContacts(opportunitySlug),
  });

  const deletePerson = useMutation({
    mutationFn: async (personSlug: string) => {
      await api.deletePerson(personSlug);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["opportunity-contacts", opportunitySlug],
      });
      void queryClient.invalidateQueries({ queryKey: ["people"] });
    },
  });

  const parseJob = useMutation({
    mutationFn: async ({ personSlug, jobDescriptionText }: { personSlug: string; jobDescriptionText: string }) => {
      return await api.parseCurrentJob(personSlug, jobDescriptionText);
    },
    onSuccess: (data, variables) => {
      const person = typedContacts.find((c) => c.slug === variables.personSlug);
      if (person) {
        setReviewTimeline({
          person,
          currentTimeline: data.currentTimeline,
          updatedTimeline: data.updatedTimeline,
        });
      }
      setManualUpdatePerson(null);
    },
    onError: (error: any) => {
      console.error("Parse job failed:", error);
      alert(error?.message || "Failed to parse job description. Please try again.");
    },
  });

  const applyJobUpdate = useMutation({
    mutationFn: async ({ personSlug, updatedTimeline }: { personSlug: string; updatedTimeline: any }) => {
      return await api.applyJobUpdate(personSlug, updatedTimeline);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["opportunity-contacts", opportunitySlug],
      });
      void queryClient.invalidateQueries({ queryKey: ["people"] });
      setReviewTimeline(null);
    },
    onError: (error: any) => {
      console.error("Apply job update failed:", error);
      alert(error?.message || "Failed to apply changes. Please try again.");
    },
  });

  // Cast contacts to Person type
  const typedContacts = contacts as Person[];

  // Derive selectedPerson from the latest contacts data
  const selectedPerson = selectedPersonSlug ? typedContacts.find((c) => c.slug === selectedPersonSlug) || null : null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between rounded-lg p-2 transition-colors hover:bg-surface-container"
      >
        <h3 className="font-title-md text-title-md font-bold uppercase tracking-wide text-on-surface">Contacts</h3>
        <div className="flex items-center gap-2">
          {typedContacts.length > 0 && (
            <span className="text-body-sm text-on-surface-variant">{typedContacts.length}</span>
          )}
          <ChevronDown
            className={`h-5 w-5 text-on-surface-variant transition-transform ${isExpanded ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      {isExpanded && (
        <>
          {typedContacts.length === 0 ? (
            <p className="text-body-sm text-on-surface-variant">No contacts yet</p>
          ) : (
            <div className="space-y-2">
              {typedContacts.map((contact) => (
                <div
                  key={contact.id}
                  className="group flex w-full items-start gap-3 rounded-lg border border-outline-variant bg-surface p-3 transition-colors hover:bg-surface-container"
                >
                  <button
                    onClick={() =>
                      detectCompanyMismatch(contact, companyName)
                        ? setFixMismatchPerson(contact)
                        : setSelectedPersonSlug(contact.slug)
                    }
                    className="flex min-w-0 flex-1 items-start gap-3 text-left"
                  >
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <MaterialIcon name="person" className="text-[20px] text-primary" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-title-sm text-title-sm font-bold text-on-surface">
                            {contact.name}
                            {contact.email ? ` (${contact.email})` : ""}
                          </p>
                          {contact.title && (
                            <p className="truncate text-body-sm text-on-surface-variant">{contact.title}</p>
                          )}
                        </div>
                        <MaterialIcon
                          name="open_in_new"
                          className="flex-shrink-0 text-[18px] text-on-surface-variant opacity-0 transition-opacity group-hover:opacity-100"
                        />
                      </div>

                      <div className="mt-1 flex items-center gap-2">
                        {contact.research && (
                          <div className="flex items-center gap-1.5">
                            <MaterialIcon name="check_circle" className="text-[16px] text-tertiary" />
                            <span className="text-body-xs text-tertiary">Researched</span>
                          </div>
                        )}
                        {detectCompanyMismatch(contact, companyName) && (
                          <div className="flex items-center gap-1.5">
                            <MaterialIcon name="warning" className="text-[14px] text-warning" />
                            <span className="text-body-xs font-medium text-warning">Company mismatch</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm(`Delete ${contact.name}?`)) {
                        deletePerson.mutate(contact.slug);
                      }
                    }}
                    className="flex-shrink-0 rounded-lg p-2 text-error opacity-0 transition-opacity hover:bg-error/10 group-hover:opacity-100"
                    title="Delete contact"
                  >
                    <MaterialIcon name="delete" className="text-[20px]" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {selectedPerson && (
        <PersonInfoModal
          person={selectedPerson}
          isOpen={!!selectedPerson}
          onClose={() => setSelectedPersonSlug(null)}
          onRefreshResearch={() => {
            setResearchPerson({
              name: selectedPerson.name,
              title: selectedPerson.title || undefined,
              company: companyName,
              linkedinUrl: selectedPerson.linkedinUrl || undefined,
              email: selectedPerson.email || undefined,
            });
            setResearchPersonSlug(selectedPerson.slug);
            setSelectedPersonSlug(null);
          }}
          onMarkAsWrong={() => {
            setFixMismatchPerson(selectedPerson);
            setSelectedPersonSlug(null);
          }}
          onDelete={() => {
            if (window.confirm(`Delete ${selectedPerson.name}? This will remove all their research data.`)) {
              deletePerson.mutate(selectedPerson.slug);
              setSelectedPersonSlug(null);
            }
          }}
        />
      )}

      {researchPerson && (
        <PersonResearchFlow
          person={researchPerson}
          isOpen={!!researchPerson}
          onClose={() => {
            setResearchPerson(null);
            setResearchPersonSlug(undefined);
          }}
          onSaved={() => {
            setResearchPerson(null);
            setResearchPersonSlug(undefined);
          }}
          opportunitySlug={opportunitySlug}
          opportunityCompanyName={companyName}
          personSlug={researchPersonSlug} // Use explicit slug state
        />
      )}

      {fixMismatchPerson && (
        <FixCompanyMismatchModal
          isOpen={!!fixMismatchPerson}
          onClose={() => setFixMismatchPerson(null)}
          person={fixMismatchPerson}
          opportunityCompanyName={companyName}
          onAutoRefresh={() => {
            // Trigger auto-refresh by re-running person research WITH existing person slug
            console.log("[AUTO REFRESH] Setting personSlug:", fixMismatchPerson.slug);
            setResearchPersonSlug(fixMismatchPerson.slug); // Set slug separately for clarity
            setResearchPerson({
              name: fixMismatchPerson.name,
              title: fixMismatchPerson.title || undefined,
              company: companyName,
              linkedinUrl: fixMismatchPerson.linkedinUrl || undefined,
              email: fixMismatchPerson.email || undefined,
            });
            setFixMismatchPerson(null);
          }}
          onManualUpdate={() => {
            setManualUpdatePerson(fixMismatchPerson);
            setFixMismatchPerson(null);
          }}
        />
      )}

      {manualUpdatePerson && (
        <ManualJobUpdateModal
          isOpen={!!manualUpdatePerson}
          onClose={() => setManualUpdatePerson(null)}
          person={manualUpdatePerson}
          opportunityCompanyName={companyName}
          onSubmit={(jobDescription) => {
            parseJob.mutate({
              personSlug: manualUpdatePerson.slug,
              jobDescriptionText: jobDescription,
            });
          }}
          isLoading={parseJob.isPending}
        />
      )}

      {reviewTimeline && (
        <ReviewJobTimelineModal
          isOpen={!!reviewTimeline}
          onClose={() => setReviewTimeline(null)}
          personName={reviewTimeline.person.name}
          currentTimeline={reviewTimeline.currentTimeline}
          updatedTimeline={reviewTimeline.updatedTimeline}
          onApply={() => {
            applyJobUpdate.mutate({
              personSlug: reviewTimeline.person.slug,
              updatedTimeline: reviewTimeline.updatedTimeline,
            });
          }}
          isApplying={applyJobUpdate.isPending}
        />
      )}
    </div>
  );
}
