import { useState } from "react";
import type { Opportunity } from "../../lib/types";
import { PreparationCard, SectionHeader } from "@interviews-tracker/design-system";

export type InterviewPreparationProps = {
  opportunity: Opportunity;
  className?: string;
};

export function InterviewPreparation({
  opportunity,
  className = "",
}: InterviewPreparationProps) {
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  const toggleCard = (cardId: string) => {
    setExpandedCard((current) => (current === cardId ? null : cardId));
  };

  return (
    <section id="interview-preparation-section" className={className}>
      <SectionHeader
        title="Interview Preparation"
        subtitle="AI-powered insights to help you prepare for this opportunity"
      />

      <div className="mt-6 grid grid-cols-1 gap-3 lg:grid-cols-2">
        <PreparationCard
          icon="business"
          title="Company Context"
          description="Key information about the company"
          action={{
            label: "Open full preparation",
            onClick: () => toggleCard("company"),
          }}
          content={
            expandedCard === "company" ? (
              <div className="space-y-3">
                <div>
                  <div className="mb-1 text-xs font-medium uppercase text-neutral-500">
                    Stage
                  </div>
                  <div>{opportunity.companyStage?.label || "Not specified"}</div>
                </div>
                <div>
                  <div className="mb-1 text-xs font-medium uppercase text-neutral-500">
                    Company Size
                  </div>
                  <div>{opportunity.employeesRange?.label || "Not specified"}</div>
                </div>
              </div>
            ) : (
              <p className="line-clamp-2">
                {opportunity.notes ||
                  "Research the company's recent developments, culture, and tech stack."}
              </p>
            )
          }
        />

        <PreparationCard
          icon="work"
          title="Role & Expectations"
          description="What this role looks like"
          action={{
            label: "View role details",
            onClick: () => toggleCard("role"),
          }}
          content={
            expandedCard === "role" ? (
              <div className="space-y-3">
                <div>
                  <div className="mb-1 text-xs font-medium uppercase text-neutral-500">
                    Role Title
                  </div>
                  <div className="font-medium">{opportunity.roleTitle}</div>
                </div>
                {opportunity.techStack && (
                  <div>
                    <div className="mb-1 text-xs font-medium uppercase text-neutral-500">
                      Tech Stack
                    </div>
                    <div>{opportunity.techStack}</div>
                  </div>
                )}
                {opportunity.backendFrontendSplit && (
                  <div>
                    <div className="mb-1 text-xs font-medium uppercase text-neutral-500">
                      Focus Area
                    </div>
                    <div>{opportunity.backendFrontendSplit}</div>
                  </div>
                )}
              </div>
            ) : (
              <p className="line-clamp-2">
                {opportunity.roleTitle} •{" "}
                {opportunity.techStack || "Tech stack not specified"}
              </p>
            )
          }
        />

        <PreparationCard
          icon="groups"
          title="Interviewers Insights"
          description="Research on people you'll meet"
          action={{
            label: "View contacts",
            onClick: () => {
              document
                .getElementById("contacts-section")
                ?.scrollIntoView({ behavior: "smooth" });
            },
          }}
          content={
            <p className="line-clamp-2">
              {opportunity.interactions.filter((i) => i.personName).length > 0
                ? `You've interacted with ${opportunity.interactions.filter((i) => i.personName).length} people from this company.`
                : "Add interactions to track who you're meeting with."}
            </p>
          }
        />

        <PreparationCard
          icon="stars"
          title="Talking Points"
          description="Suggested discussion topics"
          action={{
            label: "Add to notes",
            onClick: () => toggleCard("talking-points"),
          }}
          content={
            <ul className="list-inside list-disc space-y-1">
              <li>Ask about team structure and collaboration</li>
              <li>Discuss technical challenges and growth</li>
              <li>Understand day-to-day responsibilities</li>
            </ul>
          }
        />
      </div>
    </section>
  );
}
