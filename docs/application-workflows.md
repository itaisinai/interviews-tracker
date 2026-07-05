# Application Workflows

This document describes the real user-facing workflows that the repo supports today. Use it to understand product behavior before changing routes, services, UI flows, or AI prompts.

## Opportunity lifecycle

1. A lead enters the system from manual entry, pasted job text, LinkedIn extension import, or Telegram.
2. The opportunity is saved with `ownerEmail`, company, role, pipeline type, status, priority, source links, and optional company facts.
3. The user enriches it with contacts, notes, tasks, compensation notes, company research, and interactions.
4. Status and pipeline type move the opportunity between potential, active process, and archived views.
5. Interactions and tasks drive the next-action experience.

## Interaction management

Interactions represent recruiter calls, phone screens, technical interviews, final rounds, follow-ups, and related events.

Supported operations:

- create manually;
- parse from pasted text;
- import from Gmail;
- attach additional Gmail messages;
- attach feedback text and AI-extracted feedback metadata;
- track status, agenda, meeting link, participants, notes, outcome, and follow-up.

The UI should keep creation flows focused and reviewable. Source-derived data should be shown as a draft before it overwrites user-owned fields.

## Gmail import workflow

Purpose: reduce manual interaction entry by finding relevant email/calendar context and converting it into an interaction draft.

Flow:

1. User connects Gmail through Google OAuth.
2. API stores encrypted refresh credentials for the owner.
3. User opens an opportunity and starts Gmail import.
4. API searches Gmail using company/role context.
5. User or AI-assisted flow selects a relevant message.
6. API fetches message detail and extracts interaction fields.
7. Web app shows a review surface with changed/new fields and email source context.
8. User accepts, edits manually, hides an irrelevant message, or cancels.
9. Save creates/updates the interaction and attaches `InteractionEmail` for traceability.

Rules:

- Do not silently overwrite important user fields without review.
- Keep email source metadata attached to saved interactions.
- Prefer explicit dates/times from Gmail/calendar data before asking AI to infer.
- Hidden/used Gmail states should prevent repeated irrelevant suggestions.

## LinkedIn job import workflow

Purpose: capture a LinkedIn job page directly into the CRM.

Flow:

1. User loads the Chrome extension on a LinkedIn job page.
2. Extension authenticates with Auth0 PKCE or uses manual dev token fallback.
3. Content/popup code extracts job title, company, location, URL, LinkedIn job ID, and page text where available.
4. Extension calls the API import endpoint.
5. API normalizes and de-duplicates by owner/source identifiers.
6. Opportunity is created or updated and can be opened in the web app.

See [LinkedIn job import](linkedin-job-import.md) for setup and extension details.

## Telegram bot workflows

The Telegram bot supports two high-value mobile workflows.

### Create opportunity from message

1. User sends job text, recruiter message, or lead summary to the bot.
2. Webhook validates the Telegram secret and allowed user/chat configuration.
3. AI classifies the message as opportunity creation.
4. API parses structured opportunity fields.
5. Opportunity is created for the configured owner.
6. Bot replies with a concise confirmation and app link when possible.

### Query opportunities

1. User asks a question such as “what is my next interview?” or “what is active this week?”
2. AI classifies the message as a query.
3. API fetches owner-scoped opportunity and interaction data.
4. AI answers using only supplied CRM data.
5. Bot returns an answer plus relevant opportunity links or a clarification request.

Rules:

- Authorization must fail closed if no allowed Telegram users/chats are configured.
- Query answers must be grounded in fetched CRM data.
- Bot-created opportunities belong to `ALLOWED_EMAIL` in the current single-owner deployment model.

## Company and person research

Research features enrich opportunities and contacts with external context.

- Company research may use configured search/research providers and AI summarization to populate product, traction, tech stack, funding, and company details.
- Person research helps identify current role/context for contacts and interviewers.
- User review should remain part of the workflow because provider and AI data can be incomplete or wrong.

## Health and monitoring workflows

- `/health` is the fast uptime endpoint and should not depend on the database.
- `/health/deep` checks database connectivity and returns failure when dependencies are unhealthy.
- `/ready` is intended for load balancer/orchestrator readiness and should return 503 when the API cannot serve traffic safely.
