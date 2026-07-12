import { useState } from "react";

import { useAuth0 } from "@auth0/auth0-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { MaterialIcon } from "@interviews-tracker/design-system";

import { api } from "../../lib/api";
import type { Person } from "../../lib/types";
import { PersonInfoModal } from "../contacts/person-info-modal";
import { PersonResearchFlow } from "../person-research/person-research-flow";

type ParticipantsCardProps = {
  personNames: string[]; // Can contain names or emails
  personRecords: Array<Person | undefined>;
  opportunitySlug?: string;
  opportunityCompanyName?: string;
  columns?: 1 | 2; // 1 for single column (drawer), 2 for two columns (opportunity page)
};

export function ParticipantsCard({
  personNames,
  personRecords,
  opportunitySlug,
  opportunityCompanyName,
  columns = 2,
}: ParticipantsCardProps) {
  const { user } = useAuth0();
  const queryClient = useQueryClient();
  const [researchModalOpen, setResearchModalOpen] = useState(false);
  const [personDetailModalOpen, setPersonDetailModalOpen] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [selectedPersonName, setSelectedPersonName] = useState<string>("");
  const [selectedLinkedinUrl, setSelectedLinkedinUrl] = useState<string | null>(null);

  const markAsWrong = useMutation({
    mutationFn: async (personId: string) => {
      if (!opportunitySlug) throw new Error("No opportunity ID");
      return api.markPersonAsWrong(personId, opportunitySlug, selectedPersonName, undefined);
    },
    onSuccess: () => {
      // Refresh contacts list
      if (opportunitySlug) {
        void queryClient.invalidateQueries({
          queryKey: ["opportunity-contacts", opportunitySlug],
        });
      }
      setPersonDetailModalOpen(false);
      setSelectedPerson(null);
    },
    onError: (error) => {
      console.error("Failed to mark person as wrong:", error);
      alert("Failed to mark person as wrong. Please try again.");
    },
  });

  // Filter out current user from participants list
  const participantsToShow = personNames
    .map((name, index) => ({ name, person: personRecords[index], index }))
    .filter(({ name, person }) => {
      // Check if this is the current user
      const nameIsEmail = name.includes("@");
      const namesMatch = user?.name && name.toLowerCase() === user.name.toLowerCase();
      const isCurrentUser =
        user?.email &&
        ((person?.email && person.email.toLowerCase() === user.email.toLowerCase()) ||
          (nameIsEmail && name.toLowerCase() === user.email.toLowerCase()) ||
          namesMatch);
      return !isCurrentUser; // Exclude current user
    });

  if (participantsToShow.length === 0) {
    return null;
  }

  return (
    <>
      <div className="bg-white rounded-lg border border-neutral-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <MaterialIcon name="group" className="text-[18px] text-neutral-600" />
            <h3 className="text-sm font-semibold text-neutral-900">Participants</h3>
          </div>
        </div>

        {/* Participants List */}
        <div className={columns === 1 ? "space-y-2" : "grid grid-cols-2 gap-2"}>
          {participantsToShow.map(({ name, person, index }) => {
            return (
              <div
                key={name}
                className="flex items-center justify-between rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5 transition-colors hover:bg-neutral-100"
                title={person?.title || undefined}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <MaterialIcon name="person" className="text-[18px] text-neutral-400 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-neutral-900 truncate">{name}</div>
                    {person?.title && (
                      <div className="text-xs text-neutral-600 truncate mt-0.5">
                        {person.title.replace(/\s*\(Current\)\s*$/i, "")}
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => {
                    if (person?.research) {
                      setSelectedPerson(person);
                      setPersonDetailModalOpen(true);
                    } else {
                      setSelectedPersonName(name);
                      setSelectedLinkedinUrl(null); // Clear stale LinkedIn URL for new searches
                      setResearchModalOpen(true);
                    }
                  }}
                  className="flex-shrink-0 rounded-lg p-1.5 text-neutral-500 transition-colors hover:bg-neutral-200 hover:text-emerald-600"
                  title={person?.research ? "View details" : "Research person"}
                >
                  <MaterialIcon name={person?.research ? "badge" : "search"} className="text-[18px]" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Research Modal */}
      <PersonResearchFlow
        person={{
          name: selectedPersonName,
          title: null,
          linkedinUrl: selectedLinkedinUrl,
        }}
        opportunitySlug={opportunitySlug}
        opportunityCompanyName={opportunityCompanyName}
        isOpen={researchModalOpen}
        onClose={() => setResearchModalOpen(false)}
        onSaved={() => setResearchModalOpen(false)}
      />

      {/* Person Info Modal */}
      {selectedPerson && (
        <PersonInfoModal
          person={selectedPerson}
          isOpen={personDetailModalOpen}
          onClose={() => {
            setPersonDetailModalOpen(false);
            setSelectedPerson(null);
          }}
          onRefreshResearch={() => {
            setPersonDetailModalOpen(false);
            setSelectedPersonName(selectedPerson.name);
            setSelectedLinkedinUrl(selectedPerson.linkedinUrl || null);
            setResearchModalOpen(true);
          }}
          onMarkAsWrong={() => {
            if (
              selectedPerson &&
              window.confirm(
                `Mark ${selectedPerson.name} as the wrong person? This will help future searches exclude this candidate.`
              )
            ) {
              markAsWrong.mutate(selectedPerson.slug);
              setPersonDetailModalOpen(false);
              setSelectedPerson(null);
            }
          }}
          onDelete={() => {
            if (
              selectedPerson &&
              window.confirm(`Delete ${selectedPerson.name}? This will remove all their research data.`)
            ) {
              // You would implement delete here if needed
              setPersonDetailModalOpen(false);
              setSelectedPerson(null);
            }
          }}
          showActions={{
            refreshResearch: true,
            markAsWrong: !!opportunitySlug,
            delete: false, // Don't show delete in interaction drawer
          }}
        />
      )}
    </>
  );
}
