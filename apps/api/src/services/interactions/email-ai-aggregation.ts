import { getAiParserService } from "../ai/ai-parser-service.js";
import { prisma } from "../../lib/prisma.js";

type InteractionEmail = {
  id: string;
  subject: string | null;
  from: string | null;
  receivedDate: Date | null;
  extractedData: unknown;
};

type InteractionWithEmails = {
  id: string;
  jobOpportunity: {
    companyName: string;
    roleTitle: string | null;
  } | null;
  attachedEmails: InteractionEmail[];
};

type AiSuggestion = Awaited<ReturnType<ReturnType<typeof getAiParserService>['parseMultipleEmailsToInteraction']>>;

/**
 * Prepare email data for AI parsing
 */
function prepareEmailsForAI(attachedEmails: InteractionEmail[]) {
  const emails = [];

  for (const email of attachedEmails) {
    const data = email.extractedData as any;
    const structured = data?.structured;
    if (!structured?.plainText) continue;

    emails.push({
      subject: email.subject || '',
      from: email.from || '',
      date: email.receivedDate?.toISOString() || '',
      body: structured.plainText.slice(0, 2000),
      calendar: structured.calendar ? {
        start: structured.calendar.start || null,
        end: structured.calendar.end || null,
        summary: structured.calendar.summary || null,
        location: structured.calendar.location || null
      } : null
    });
  }

  return emails;
}

/**
 * Generate AI suggestion from attached emails (does NOT save to database)
 */
export async function generateAiSuggestionFromEmails(
  interaction: InteractionWithEmails
): Promise<AiSuggestion | null> {
  const emails = prepareEmailsForAI(interaction.attachedEmails);

  if (emails.length === 0) {
    return null;
  }

  const aiService = getAiParserService();
  const aiSuggestion = await aiService.parseMultipleEmailsToInteraction({
    companyName: interaction.jobOpportunity?.companyName || 'Unknown',
    roleTitle: interaction.jobOpportunity?.roleTitle || null,
    emails
  });

  return aiSuggestion;
}

/**
 * Aggregate attached emails and save to database
 * This is the auto-save version used by legacy flows
 */
export async function aggregateAndSaveInteractionEmails(interactionId: string) {
  console.log('[AGGREGATE] ========== START ==========');
  console.log('[AGGREGATE] Interaction ID:', interactionId);

  const interaction = await prisma.interaction.findUnique({
    where: { id: interactionId },
    include: {
      attachedEmails: { orderBy: { receivedDate: 'desc' } },
      jobOpportunity: { select: { companyName: true, roleTitle: true } }
    }
  });

  if (!interaction) {
    console.log('[AGGREGATE] Interaction not found');
    return;
  }

  if (interaction.attachedEmails.length === 0) {
    console.log('[AGGREGATE] No attached emails');
    return;
  }

  console.log(`[AGGREGATE] Found ${interaction.attachedEmails.length} attached emails`);

  const aiSuggestion = await generateAiSuggestionFromEmails(interaction);

  if (!aiSuggestion) {
    console.log('[AGGREGATE] ⚠️ No AI suggestion generated');
    return;
  }

  console.log('[AGGREGATE] ✅ AI returned result');
  console.log('[AGGREGATE] notes:', aiSuggestion.notes);

  await prisma.interaction.update({
    where: { id: interactionId },
    data: {
      date: new Date(aiSuggestion.date),
      endDate: aiSuggestion.endDate ? new Date(aiSuggestion.endDate) : null,
      type: aiSuggestion.type,
      stage: aiSuggestion.stage || null,
      status: aiSuggestion.status as any,
      personName: aiSuggestion.personName || null,
      personRole: aiSuggestion.personRole || null,
      agenda: aiSuggestion.agenda || null,
      meetingLink: aiSuggestion.meetingLink || null,
      notes: aiSuggestion.notes || null,
      outcome: aiSuggestion.outcome || null,
      followUp: aiSuggestion.followUp || null
    }
  });

  console.log('[AGGREGATE] ✅ Database updated');

  const { syncOpportunityStatusRecord } = await import("../../repositories/opportunity-repository.js");
  await syncOpportunityStatusRecord(interaction.jobOpportunityId, interaction.ownerEmail);

  console.log('[AGGREGATE] ========== END ==========');
}
