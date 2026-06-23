import { useState } from "react";
import { MaterialIcon, ParticipantList } from "@interviews-tracker/design-system";
import type { Participant } from "@interviews-tracker/design-system";
import { PersonResearchFlow } from "../person-research/person-research-flow";
import { PersonInfoModal } from "../contacts/person-info-modal";
import type { Person } from "../../lib/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";

type ParticipantsCardProps = {
  personNames: string[];
  personRecords: Array<Person | undefined>;
  opportunityId?: string;
  opportunityCompanyName?: string;
};

export function ParticipantsCard({
  personNames,
  personRecords,
  opportunityId,
  opportunityCompanyName
}: ParticipantsCardProps) {
  const queryClient = useQueryClient();
  const [researchModalOpen, setResearchModalOpen] = useState(false);
  const [personDetailModalOpen, setPersonDetailModalOpen] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [selectedPersonName, setSelectedPersonName] = useState<string>("");
  const [selectedLinkedinUrl, setSelectedLinkedinUrl] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const markAsWrong = useMutation({
    mutationFn: async (personId: string) => {
      if (!opportunityId) throw new Error("No opportunity ID");
      return api.markPersonAsWrong(personId, opportunityId, selectedPersonName, undefined);
    },
    onSuccess: () => {
      // Refresh contacts list
      if (opportunityId) {
        void queryClient.invalidateQueries({ queryKey: ["opportunity-contacts", opportunityId] });
      }
      setPersonDetailModalOpen(false);
      setSelectedPerson(null);
    },
    onError: (error) => {
      console.error("Failed to mark person as wrong:", error);
      alert("Failed to mark person as wrong. Please try again.");
    }
  });

  const filteredPersons = personNames.filter(name =>
    name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (personNames.length === 0) {
    return null;
  }

  const participants: Participant[] = filteredPersons.map((name) => {
    const index = personNames.indexOf(name);
    const person = personRecords[index];

    return {
      name,
      title: person?.title || undefined,
      hasResearch: !!person?.research,
      onViewDetails: person?.research ? () => {
        setSelectedPerson(person);
        setPersonDetailModalOpen(true);
      } : undefined,
      onResearch: !person?.research ? () => {
        setSelectedPersonName(name);
        setResearchModalOpen(true);
      } : undefined,
    };
  });

  return (
    <>
      <div className="bg-white rounded-lg border border-neutral-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <MaterialIcon name="group" className="text-[18px] text-neutral-600" />
            <h3 className="text-sm font-semibold text-neutral-900">Participants</h3>
          </div>
        </div>

        <ParticipantList
          participants={participants}
          onSearch={setSearchQuery}
          searchPlaceholder="Search participants..."
          emptyMessage="No participants found"
        />
      </div>

      {/* Research Modal */}
      <PersonResearchFlow
        person={{
          name: selectedPersonName,
          title: null,
          linkedinUrl: selectedLinkedinUrl
        }}
        opportunityId={opportunityId}
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
            if (selectedPerson && window.confirm(`Mark ${selectedPerson.name} as the wrong person? This will help future searches exclude this candidate.`)) {
              markAsWrong.mutate(selectedPerson.id);
              setPersonDetailModalOpen(false);
              setSelectedPerson(null);
            }
          }}
          onDelete={() => {
            if (selectedPerson && window.confirm(`Delete ${selectedPerson.name}? This will remove all their research data.`)) {
              // You would implement delete here if needed
              setPersonDetailModalOpen(false);
              setSelectedPerson(null);
            }
          }}
          showActions={{
            refreshResearch: true,
            markAsWrong: !!opportunityId,
            delete: false, // Don't show delete in interaction drawer
          }}
        />
      )}
    </>
  );
}
