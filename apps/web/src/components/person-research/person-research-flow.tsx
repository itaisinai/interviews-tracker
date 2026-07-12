import { useState } from "react";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { api } from "../../lib/api";
import type { PersonResearchResult } from "../../lib/types";

import {
  ConfirmResearchModal,
  LoadingResearchModal,
  ResearchErrorModal,
  ReviewResearchModal,
} from "./person-research-modals";

type PersonInfo = {
  id?: string; // Add optional ID for updating existing person
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
  opportunitySlug?: string;
  opportunityCompanyName?: string; // For company validation
  personId?: string; // Existing person ID to update instead of creating new
};

type FlowStep = "confirm" | "loading" | "review" | "error";

export function PersonResearchFlow({
  person,
  isOpen,
  onClose,
  onSaved,
  opportunitySlug,
  opportunityCompanyName,
  personId,
}: PersonResearchFlowProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<FlowStep>("confirm");
  const [researchResult, setResearchResult] = useState<PersonResearchResult | null>(null);
  const [saveForLater, setSaveForLater] = useState(true);
  const [linkedinUrlOverride, setLinkedinUrlOverride] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Log personId when component mounts or personId changes (debug only)
  // console.log('[PersonResearchFlow] Rendered with personId:', personId, 'person:', person);

  const resetFlow = () => {
    setStep("confirm");
    setResearchResult(null);
    setLinkedinUrlOverride("");
    setErrorMessage(null);
    onClose();
  };

  const research = useMutation({
    mutationFn: async ({ linkedinUrl, save }: { linkedinUrl: string; save: boolean }) => {
      setSaveForLater(save);
      setLinkedinUrlOverride(linkedinUrl);
      setStep("loading");

      // Cast to any to add opportunitySlug since it's not in the PersonResearchInput type yet
      const result = await api.researchPerson({
        name: person.name,
        companyName: opportunityCompanyName || person.company || undefined,
        roleTitle: person.title || undefined,
        linkedinUrl: linkedinUrl || person.linkedinUrl || undefined,
        opportunitySlug,
      } as any);

      if (!result) {
        throw new Error(
          opportunityCompanyName || person.company
            ? `No matching LinkedIn profile was found for ${person.name} at ${opportunityCompanyName || person.company}. Try adding the person's LinkedIn URL or checking the company name.`
            : `No LinkedIn profile was found for ${person.name}. Try adding the person's LinkedIn URL.`
        );
      }

      return result;
    },
    onSuccess: (result) => {
      setErrorMessage(null);
      setResearchResult(result);
      setStep("review");
    },
    onError: (error) => {
      console.error("Research failed:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Couldn't research this person. Please try again or add a LinkedIn URL."
      );
      setStep("error");
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!researchResult) {
        throw new Error("No research result to save");
      }

      console.log("[SAVE PERSON] personId:", personId, "opportunitySlug:", opportunitySlug);

      // If personId is provided, update existing person instead of creating new
      if (personId) {
        console.log("[SAVE PERSON] Updating existing person:", personId);
        // Update person's basic data from research result
        await api.updatePerson(personId, {
          name: researchResult.person.name,
          linkedinUrl: linkedinUrlOverride || researchResult.person.linkedinUrl || undefined,
          title: researchResult.person.title || undefined,
          company: researchResult.person.company || undefined,
          avatarUrl: researchResult.person.avatarUrl || undefined,
        });

        // Update existing person's research
        if (saveForLater) {
          await api.savePersonResearch(personId, researchResult.research);
        }

        return { id: personId };
      }

      console.log("[SAVE PERSON] Creating new person");
      // Detect if the original person.name is an email
      const isEmail = person.name.includes("@");
      const emailToStore = isEmail ? person.name : person.email || undefined;

      // Create or find person
      const personRecord = await api.createPerson({
        name: researchResult.person.name,
        email: emailToStore,
        linkedinUrl: linkedinUrlOverride || researchResult.person.linkedinUrl || undefined,
        title: researchResult.person.title || undefined,
        company: researchResult.person.company || undefined,
        avatarUrl: researchResult.person.avatarUrl || undefined,
        opportunitySlug: opportunitySlug, // Use slug, not ID
      });

      // Save research
      if (saveForLater) {
        await api.savePersonResearch(personRecord.slug, researchResult.research);
      }

      return personRecord;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["people"] });
      void queryClient.invalidateQueries({ queryKey: ["interactions"] });
      void queryClient.invalidateQueries({ queryKey: ["opportunities"] });
      if (opportunitySlug) {
        void queryClient.invalidateQueries({
          queryKey: ["opportunity-contacts", opportunitySlug],
        });
      }

      onSaved?.();
      resetFlow();

      // Show success toast - would integrate with app toast system
      console.log("Research saved successfully");
    },
    onError: (error: any) => {
      console.error("Save failed:", error);
      // Extract error message from API response
      const errorMessage =
        error?.response?.data?.message || error?.message || "Failed to save contact. Please try again.";
      alert(errorMessage);
    },
  });

  const handleStartResearch = (linkedinUrl: string, save: boolean) => {
    research.mutate({ linkedinUrl, save });
  };

  const handleRetry = () => {
    setErrorMessage(null);
    setStep("confirm");
  };

  const handleDiscard = () => {
    resetFlow();
  };

  const handleSave = () => {
    save.mutate();
  };

  const handleMarkWrong = async () => {
    if (!researchResult || !opportunitySlug) return;

    if (
      confirm(
        `Mark ${researchResult.person.name} as wrong candidate? This will exclude them from future searches for this opportunity.`
      )
    ) {
      try {
        await api.markResearchAsWrongCandidate({
          opportunitySlug: opportunitySlug,
          linkedinUrl: researchResult.person.linkedinUrl || "",
          personName: researchResult.person.name,
          company: researchResult.person.company,
          title: researchResult.person.title,
          avatarUrl: researchResult.person.avatarUrl,
          searchContext: person.name,
        });
        console.log("[MARK WRONG] Successfully marked candidate as wrong");
        resetFlow();
      } catch (error) {
        console.error("[MARK WRONG] Failed:", error);
        alert("Failed to mark as wrong candidate. Please try again.");
      }
    }
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
          onMarkWrong={opportunitySlug ? handleMarkWrong : undefined}
          isSaving={save.isPending}
        />
      ) : null}

      <ResearchErrorModal
        isOpen={isOpen && step === "error"}
        onClose={resetFlow}
        onRetry={handleRetry}
        message={errorMessage || undefined}
      />
    </>
  );
}
