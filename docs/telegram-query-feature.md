# Telegram Bot Query Feature

## Overview

The Telegram bot now supports **two modes**:

1. **Create Opportunity** - Parse job descriptions and create new opportunities
2. **Query Opportunities** - Answer questions about existing opportunities

The bot automatically detects which mode to use based on the message content using AI intent classification.

---

## How It Works

### 1. Intent Classification

When a non-command message is received:

1. AI classifies the message as either `QUERY` or `CREATE_OPPORTUNITY`
2. Returns confidence score (0-1) and reasoning
3. Routes to appropriate handler

**Query Examples:**
- "What's my next interview?"
- "What's the next interaction at company Alta?"
- "What are my active processes?"
- "Who are the participants in my Google interview?"
- "What are the instructions for my next interview?"

**Create Opportunity Examples:**
- "Senior Software Engineer at Google, $180k-$220k"
- "Backend role at Stripe, remote position"
- "Just got a message from Meta recruiter"

### 2. Query Flow

When a query is detected:

1. Fetch opportunities filtered by `ownerEmail` (from `ALLOWED_EMAIL` env var)
2. Format opportunities as JSON for AI processing
3. AI answers the query based on real data
4. Format response with Markdown and web app links
5. Handle clarification if data is ambiguous/missing

### 3. Response Format

**Successful Query:**
```
💡 Query Result

Your next interview is on Jan 15 at 2pm with Google (Senior Engineer role) - a Technical Interview with Sarah Chen.

📎 Related Opportunities:
• Google - Senior Engineer (link)
• Meta - Frontend Lead (link)
```

**Needs Clarification:**
```
💡 Query Result

I couldn't find any company called 'Alta' in your opportunities.

❓ Did you mean a different company name?
```

---

## Architecture

### New Services

1. **telegram-query-service.ts**
   - `classifyMessageIntent()` - AI intent classification
   - `answerOpportunityQuery()` - AI query answering with real data

2. **opportunity-query-data-service.ts**
   - `getOpportunitiesDataForQuery()` - Fetch user's opportunities
   - `formatOpportunitiesForAI()` - Format as JSON for AI prompt

3. **telegram-response-formatter.ts**
   - `formatQueryResponseForTelegram()` - Markdown + links
   - `formatOpportunityCreatedMessage()` - Success message
   - `formatErrorMessage()` - Error formatting

### Updated Services

**telegram-service.ts:**
- Added intent classification before routing
- New `handleOpportunityQuery()` function
- Updated help/start messages
- Falls back to opportunity creation if classification fails

---

## Configuration

### Environment Variables

```env
# Required for telegram queries
WEB_APP_BASE_URL=http://localhost:3000  # or production URL
ALLOWED_EMAIL=your-email@example.com    # User email for filtering
OPENAI_API_KEY=your-openai-key          # AI classification & answering
```

---

## Testing Scenarios

### 1. Query: Next Interview

**Input:** "What's my next interview?"

**Expected:**
- Finds the next SCHEDULED interaction
- Returns date, time, company, role, type, participants
- Includes link to opportunity page

### 2. Query: Active Processes

**Input:** "What are my active processes?"

**Expected:**
- Lists all opportunities with `pipelineType=ACTIVE_PROCESS`
- Shows latest interaction status for each
- Includes links to each opportunity

### 3. Query: Specific Company

**Input:** "What's the next interaction at company Google?"

**Expected:**
- Filters to Google opportunities
- Returns next scheduled interaction
- If none found, asks for clarification

### 4. Query: Participants

**Input:** "Who are the participants in my next interview?"

**Expected:**
- Finds next interview
- Lists participants from `interaction.personName`
- Shows their roles if available

### 5. Create Opportunity

**Input:** "Senior Engineer at Apple, $200k, applied yesterday"

**Expected:**
- Detects as CREATE_OPPORTUNITY intent
- Parses job description with AI
- Creates opportunity
- Returns success message with link

### 6. Ambiguous Query

**Input:** "Tell me about my process"

**Expected:**
- AI may need clarification
- Returns question like "Which company are you asking about?"

---

## Data Filtering

**Important:** Queries only return opportunities where:
- `ownerEmail` matches `ALLOWED_EMAIL` env var
- `pipelineType` is `ACTIVE_PROCESS` or `POTENTIAL` (excludes ARCHIVED)
- Interactions are ordered by date

This ensures:
1. Users only see their own data
2. Relevant opportunities are prioritized
3. Query responses are focused and actionable

---

## Error Handling

### Intent Classification Fails
- Falls back to opportunity creation (old behavior)
- Logs error for debugging

### Query Answering Fails
- Returns formatted error message
- Suggests user try again or rephrase

### No Opportunities Found
- AI sets `needsClarification=true`
- Returns helpful clarification question

---

## Future Enhancements

Potential improvements:
1. Multi-user support with user ID mapping
2. Query history and follow-up questions
3. More complex queries (date ranges, status filters)
4. Interactive buttons for common queries
5. Voice message support
6. Query suggestions based on user data

---

## Development Notes

### Testing Locally

1. Start the dev environment:
   ```bash
   npm run dev
   ```

2. Configure telegram webhook to point to your ngrok/local URL

3. Send test messages to the bot

4. Check logs in terminal for intent classification results

### Adding New Query Types

To support new query patterns:

1. Update intent classification examples in `classifyMessageIntent()`
2. Enhance AI prompt in `answerOpportunityQuery()` with new guidelines
3. Add more data fields to `getOpportunitiesDataForQuery()` if needed
4. Update help text in `telegram-service.ts`

### Schema Validation

All AI responses are validated with Zod schemas:
- `messageIntentSchema` - Intent classification
- `queryResponseSchema` - Query answers

This ensures type safety and catches AI hallucinations.

---

## Credits

Feature developed with Claude Code following the project's:
- Architecture principles (layered services)
- AI workflow patterns (confidence-based flows, review-before-save)
- Product philosophy (AI automation as default path)
