import { prisma } from "../../lib/prisma.js";

/**
 * Fetch interaction with attached emails for AI processing
 */
export async function fetchInteractionWithEmails(interactionId: string) {
  const interaction = await prisma.interaction.findUnique({
    where: { id: interactionId },
    include: {
      attachedEmails: {
        orderBy: { receivedDate: 'desc' }
      },
      jobOpportunity: {
        select: {
          roleTitle: true,
          company: {
            select: { name: true }
          }
        }
      }
    }
  });

  if (!interaction) {
    throw new Error('Interaction not found');
  }

  return interaction;
}

/**
 * Mark a Gmail message as USED in the message state
 */
export async function markEmailAsUsed(
  auth0Email: string,
  gmailMessageId: string,
  jobOpportunityId: string
) {
  await prisma.gmailMessageState.upsert({
    where: {
      auth0Email_messageId: {
        auth0Email,
        messageId: gmailMessageId
      }
    },
    create: {
      auth0Email,
      jobOpportunityId,
      messageId: gmailMessageId,
      status: "USED"
    },
    update: {
      status: "USED",
      jobOpportunityId
    }
  });
}
