import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import type { PersonResearchResult } from "../../lib/types";
import {
  ConfirmResearchModal,
  LoadingResearchModal,
  ReviewResearchModal,
  ResearchErrorModal
} from "./person-research-modals";

type PersonInfo = {
  name: string;
  title?: string | null;
  company?: string | null;
  linkedinUrl?: string | null;
  avatarUrl?: string | null;
  email?: string | null;
};

type PersonResearchFlowProps = {
  person: PersonInfo;
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
  opportunityId?: string;
};

type FlowStep = "confirm" | "loading" | "review" | "error";

export function PersonResearchFlow({ person, isOpen, onClose, onSaved, opportunityId }: PersonResearchFlowProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<FlowStep>("confirm");
  const [researchResult, setResearchResult] = useState<PersonResearchResult | null>(null);
  const [saveForLater, setSaveForLater] = useState(true);
  const [linkedinUrlOverride, setLinkedinUrlOverride] = useState("");

  const resetFlow = () => {
    setStep("confirm");
    setResearchResult(null);
    setLinkedinUrlOverride("");
    onClose();
  };

  const research = useMutation({
    mutationFn: async ({ linkedinUrl, save }: { linkedinUrl: string; save: boolean }) => {
      setSaveForLater(save);
      setLinkedinUrlOverride(linkedinUrl);
      setStep("loading");

      const result = await api.researchPerson({
        name: person.name,
        companyName: person.company || undefined,
        roleTitle: person.title || undefined,
        linkedinUrl: linkedinUrl || person.linkedinUrl || undefined
      });

      return result;
    },
    onSuccess: (result) => {
      setResearchResult(result);
      setStep("review");
    },
    onError: (error) => {
      console.error("Research failed:", error);
      setStep("error");
    }
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!researchResult) {
        throw new Error("No research result to save");
      }

      // Create or find person
      const personRecord = await api.createPerson({
        name: researchResult.person.name,
        email: person.email || undefined,
        linkedinUrl: linkedinUrlOverride || researchResult.person.linkedinUrl || undefined,
        title: researchResult.person.title || undefined,
        company: researchResult.person.company || undefined,
        avatarUrl: researchResult.person.avatarUrl || undefined,
        jobOpportunityId: opportunityId
      });

      // Save research
      if (saveForLater) {
        await api.savePersonResearch(personRecord.id, researchResult.research);
      }

      return personRecord;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["people"] });
      void queryClient.invalidateQueries({ queryKey: ["interactions"] });
      void queryClient.invalidateQueries({ queryKey: ["opportunities"] });
      if (opportunityId) {
        void queryClient.invalidateQueries({ queryKey: ["opportunity-contacts", opportunityId] });
      }

      onSaved?.();
      resetFlow();

      // Show success toast - would integrate with app toast system
      console.log("Research saved successfully");
    },
    onError: (error: any) => {
      console.error("Save failed:", error);
      // Handle validation errors
      if (error?.message?.includes("Company mismatch") || error?.message?.includes("Duplicate contact")) {
        // Show user-friendly error in the UI
        alert(error.message || "Failed to save contact. Please check the details.");
      }
    }
  });

  const handleStartResearch = (linkedinUrl: string, save: boolean) => {
    research.mutate({ linkedinUrl, save });
  };

  const handleRetry = () => {
    setStep("confirm");
  };

  const handleDiscard = () => {
    resetFlow();
  };

  const handleSave = () => {
    save.mutate();
  };

  return (
    <>
      <ConfirmResearchModal
        isOpen={isOpen && step === "confirm"}
        onClose={resetFlow}
        person={person}
        onStartResearch={handleStartResearch}
      />

      <LoadingResearchModal isOpen={isOpen && step === "loading"} />

      {researchResult ? (
        <ReviewResearchModal
          isOpen={isOpen && step === "review"}
          onClose={resetFlow}
          result={researchResult}
          saveForLater={saveForLater}
          onDiscard={handleDiscard}
          onSave={handleSave}
          isSaving={save.isPending}
        />
      ) : null}

      <ResearchErrorModal
        isOpen={isOpen && step === "error"}
        onClose={resetFlow}
        onRetry={handleRetry}
      />
    </>
  );
}
