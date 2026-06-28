import type { InteractionStatus, JobStatus } from "./enums.js";

type InteractionLike = {
  type: string;
  stage?: string | null;
  status: InteractionStatus;
  outcome?: string | null;
  followUp?: string | null;
  date?: string | Date;
};

export const jobStatusOrder: Record<JobStatus, number> = {
  RESEARCH_LEAD: 0,
  TO_APPLY: 1,
  APPLIED: 2,
  RECRUITER_REACHED_OUT: 3,
  PHONE_SCHEDULED: 4,
  PHONE_DONE: 5,
  TECHNICAL_SCHEDULED: 6,
  TECHNICAL_DONE: 7,
  HOME_ASSIGNMENT: 8,
  ASSIGNMENT_SUBMITTED: 9,
  FINAL_STAGE: 10,
  OFFER: 11,
  REJECTED: 12,
  PAUSED: 13,
  NOT_RELEVANT: 14
};

export function compareJobStatuses(left: JobStatus, right: JobStatus) {
  return jobStatusOrder[left] - jobStatusOrder[right];
}

function normalizeText(value?: string | null) {
  return (value ?? "").trim().toLowerCase();
}

function hasAny(text: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(text));
}

function deriveStatusFromInteraction(interaction: InteractionLike): JobStatus | null {
  const normalizedType = normalizeText(interaction.type);
  const text = normalizeText([normalizedType, interaction.stage, interaction.outcome, interaction.followUp].filter(Boolean).join(" "));
  const isDone = interaction.status === "DONE" || interaction.status === "NEEDS_FOLLOW_UP";
  const isScheduled = interaction.status === "SCHEDULED";

  if (!text) {
    return null;
  }

  if (interaction.status === "REJECTED") {
    return "REJECTED";
  }

  if (hasAny(text, [/offer/, /verbal offer/, /written offer/, /salary offer/, /accept(ed|ance)?/, /הצעה/])) {
    return "OFFER";
  }

  if (hasAny(text, [/reject/, /declin/, /not.*moving forward/, /moving on/, /not a fit/, /דחייה/, /נדחה/, /לא מתקדמים/])) {
    return "REJECTED";
  }

  if (hasAny(text, [/home assignment/, /take[- ]home/, /assignment/, /home task/, /task/, /project/, /משימה/])) {
    return isDone || hasAny(text, [/submitted/, /sent/, /completed/, /done/, /הוגש/, /נשלח/, /הושלם/]) ? "ASSIGNMENT_SUBMITTED" : "HOME_ASSIGNMENT";
  }

  if (hasAny(text, [/technical/, /\btech\b/, /coding/, /pair programming/, /system design/, /מבחן טכני/, /טכני/])) {
    return isDone || hasAny(text, [/completed/, /done/, /finished/, /passed/, /עבר/]) ? "TECHNICAL_DONE" : "TECHNICAL_SCHEDULED";
  }

  if (hasAny(text, [/final/, /onsite/, /on site/, /panel/, /last round/, /round 3/, /שלב סופי/, /סופי/])) {
    return "FINAL_STAGE";
  }

  // Check for recruiter screen first (before general phone patterns)
  if (hasAny(text, [/recruiter screen/, /recruiter call/])) {
    return isDone ? "PHONE_DONE" : "PHONE_SCHEDULED";
  }

  if (hasAny(text, [/recruiter/, /reached out/, /contacted/, /reach out/, /פנתה/, /פנה/, /יצרה קשר/, /פנה אל/])) {
    return "RECRUITER_REACHED_OUT";
  }

  if (hasAny(text, [/phone interview/, /phone screen/, /phone/, /screening/, /intro call/, /call/, /שיחה/, /טלפוני/, /סינון/])) {
    return isDone || hasAny(text, [/completed/, /done/, /finished/, /went well/, /good conversation/, /מוצלח/]) ? "PHONE_DONE" : "PHONE_SCHEDULED";
  }

  if (isScheduled && hasAny(text, [/interview/, /ראיון/])) {
    return "PHONE_SCHEDULED";
  }

  if (isDone && hasAny(text, [/interview/, /ראיון/])) {
    return "PHONE_DONE";
  }

  return null;
}

export function deriveOpportunityStatusFromInteractions(interactions: InteractionLike[]): JobStatus | null {
  let selected: JobStatus | null = null;

  for (const interaction of interactions.slice().sort((left, right) => {
    const leftTime = new Date(left.date ?? 0).getTime();
    const rightTime = new Date(right.date ?? 0).getTime();
    return leftTime - rightTime;
  })) {
    const candidate = deriveStatusFromInteraction(interaction);

    if (!candidate) {
      continue;
    }

    if (!selected) {
      selected = candidate;
      continue;
    }

    if (candidate === "OFFER" || candidate === "REJECTED") {
      selected = candidate;
      continue;
    }

    if (selected === "OFFER" || selected === "REJECTED") {
      continue;
    }

    if (jobStatusOrder[candidate] >= jobStatusOrder[selected]) {
      selected = candidate;
    }
  }

  return selected;
}

export function deriveOpportunityStatusFromInteraction(interaction: InteractionLike): JobStatus | null {
  return deriveStatusFromInteraction(interaction);
}
