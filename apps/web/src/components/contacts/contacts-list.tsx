import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { MaterialIcon } from "@interviews-tracker/design-system";
import { PersonResearchFlow } from "../person-research/person-research-flow";
import { PersonDetailModal } from "./person-detail-modal";
import type { Person } from "../../lib/types";

type ContactsListProps = {
  opportunityId: string;
  companyName: string;
};

export function ContactsList({ opportunityId, companyName }: ContactsListProps) {
  const queryClient = useQueryClient();
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [researchPerson, setResearchPerson] = useState<{ name: string; title?: string; company: string } | null>(null);

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ["opportunity-contacts", opportunityId],
    queryFn: () => api.getOpportunityContacts(opportunityId)
  });

  const deletePerson = useMutation({
    mutationFn: async (personId: string) => {
      await api.deletePerson(personId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["opportunity-contacts", opportunityId] });
      void queryClient.invalidateQueries({ queryKey: ["people"] });
    }
  });

  // Cast contacts to Person type
  const typedContacts = contacts as Person[];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-title-md text-title-md font-bold uppercase tracking-wide text-on-surface">
          Contacts
        </h3>
      </div>

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
                onClick={() => setSelectedPerson(contact)}
                className="flex min-w-0 flex-1 items-start gap-3 text-left"
              >
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <MaterialIcon name="person" className="text-[20px] text-primary" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-title-sm text-title-sm font-bold text-on-surface">
                        {contact.name}{contact.email ? ` (${contact.email})` : ""}
                      </p>
                      {contact.title && (
                        <p className="truncate text-body-sm text-on-surface-variant">
                          {contact.title}
                        </p>
                      )}
                    </div>
                    <MaterialIcon
                      name="open_in_new"
                      className="flex-shrink-0 text-[18px] text-on-surface-variant opacity-0 transition-opacity group-hover:opacity-100"
                    />
                  </div>

                  {contact.research && (
                    <div className="mt-1 flex items-center gap-1.5">
                      <MaterialIcon name="check_circle" className="text-[16px] text-tertiary" />
                      <span className="text-body-xs text-tertiary">Researched</span>
                    </div>
                  )}
                </div>
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm(`Delete ${contact.name}?`)) {
                    deletePerson.mutate(contact.id);
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

      {selectedPerson && (
        <PersonDetailModal
          person={selectedPerson}
          isOpen={!!selectedPerson}
          onClose={() => setSelectedPerson(null)}
          onResearch={(name, title) => {
            setSelectedPerson(null);
            setResearchPerson({ name, title, company: companyName });
          }}
          onDelete={(personId) => deletePerson.mutate(personId)}
        />
      )}

      {researchPerson && (
        <PersonResearchFlow
          person={researchPerson}
          isOpen={!!researchPerson}
          onClose={() => setResearchPerson(null)}
          onSaved={() => setResearchPerson(null)}
          opportunityId={opportunityId}
          opportunityCompanyName={companyName}
        />
      )}
    </div>
  );
}
