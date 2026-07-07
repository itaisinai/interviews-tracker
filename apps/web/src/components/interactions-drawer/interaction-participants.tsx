import { useState } from "react";
import { MaterialIcon } from "@interviews-tracker/design-system";
import { PersonResearchFlow } from "../person-research/person-research-flow";
import { PersonInfoModal } from "../contacts/person-info-modal";
import type { Person } from "../../lib/types";

type InteractionParticipantsProps = {
  personNames: string[];
  personRecords: Array<Person | undefined>;
  opportunitySlug?: string;
  opportunityCompanyName?: string;
};

/**
 * List of interaction participants with research buttons
 */
export function InteractionParticipants({
  personNames,
  personRecords,
  opportunitySlug,
  opportunityCompanyName
}: InteractionParticipantsProps) {
  const [researchModalOpen, setResearchModalOpen] = useState(false);
  const [personDetailModalOpen, setPersonDetailModalOpen] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [selectedPersonName, setSelectedPersonName] = useState<string>("");

  if (personNames.length === 0) {
    return null;
  }

  return (
    <>
      <div className="mb-8">
        <h3 className="text-sm font-medium text-neutral-900 mb-3">Participants</h3>
        <div className="space-y-2">
          {personNames.map((name, index) => {
            const person = personRecords[index];

            if (person?.research) {
              // Researched contact - clickable card
              return (
                <button
                  key={index}
                  onClick={() => {
                    setSelectedPerson(person);
                    setPersonDetailModalOpen(true);
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-neutral-50 transition-colors text-left group"
                >
                  {person.avatarUrl ? (
                    <img
                      src={person.avatarUrl}
                      alt={person.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center">
                      <MaterialIcon name="person" className="text-[20px] text-neutral-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-neutral-900">{person.name}</div>
                    {person.title && (
                      <div className="text-xs text-neutral-500 truncate">{person.title}</div>
                    )}
                  </div>
                  <MaterialIcon
                    name="arrow_forward"
                    className="text-[16px] text-neutral-400 group-hover:text-blue-600"
                  />
                </button>
              );
            } else {
              // Non-researched - simple row with icon button
              return (
                <div key={index} className="flex items-center gap-3 p-3">
                  <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center">
                    <MaterialIcon name="person" className="text-[20px] text-neutral-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-neutral-900">{name}</div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedPersonName(name);
                      setResearchModalOpen(true);
                    }}
                    className="p-1.5 rounded-lg hover:bg-neutral-100 transition-colors"
                    title="Research contact"
                  >
                    <MaterialIcon name="search" className="text-[16px] text-neutral-600" />
                  </button>
                </div>
              );
            }
          })}
        </div>
      </div>

      {/* Research Modal */}
      <PersonResearchFlow
        person={{ name: selectedPersonName }}
        isOpen={researchModalOpen}
        onClose={() => setResearchModalOpen(false)}
        opportunitySlug={opportunitySlug}
        opportunityCompanyName={opportunityCompanyName}
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
            setSelectedPerson(null);
            setSelectedPersonName(selectedPerson.name);
            setResearchModalOpen(true);
          }}
          showActions={{
            refreshResearch: true,
            markAsWrong: false,
            delete: false,
          }}
        />
      )}
    </>
  );
}
