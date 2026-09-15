# Gmail Search Flow Analysis - Current Implementation

## Problem Statement
When searching for CrowdStrike emails, the system returns many non-relevant results including emails from completely different companies (Frame Security, Connecteam, etc.).

## Current Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    USER SEARCHES FOR COMPANY                     │
│                     (e.g., "CrowdStrike")                        │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│          STEP 1: Build Gmail Search Queries                      │
│          (buildGmailSearchQueries)                               │
│                                                                   │
│  DETERMINISTIC LOGIC:                                            │
│  • Compan name: "CrowdStrike"                                    │
│  • Create variants (remove .ai suffix if exists)                 │
│  • Build queries:                                                │
│    - CrowdStrike newer_than:365d                                 │
│    - "CrowdStrike" interview newer_than:365d                     │
│    - "CrowdStrike" (interview OR recruiter OR ...)               │
│    - If roleTitle: "CrowdStrike" "roleTitle"                     │
│                                                                   │
│  ⚠️ PROBLEM #1: Queries are TOO BROAD                            │
│     "CrowdStrike newer_than:365d" matches ANY email              │
│     that mentions CrowdStrike ANYWHERE in the email              │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│          STEP 2: Execute Gmail API Search                        │
│          (fetchMessagesForQuery)                                 │
│                                                                   │
│  For each query:                                                 │
│  • Call Gmail API with query string                              │
│  • Get up to 50 results per query                                │
│  • Fetch message metadata (Subject, From, Date, snippet)         │
│  • Skip already suppressed messages (USED/HIDDEN/IGNORED)        │
│                                                                   │
│  ⚠️ PROBLEM #2: Gmail API returns false matches                  │
│     Example: Email from "Frame Security" with body text          │
│     mentioning "unlike CrowdStrike..." matches the query         │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│      STEP 3: Build Related Sender Domain Queries                 │
│      (buildRelatedSenderDomainSearchQueries)                     │
│                                                                   │
│  DETERMINISTIC LOGIC:                                            │
│  • Extract sender domains from Step 2 results                    │
│  • For each domain, check if it contains company tokens          │
│  • Example: "crowdstrike.com" → extract "crowdstrike"            │
│  • Build additional queries:                                     │
│    - crowdstrike newer_than:365d                                 │
│    - "crowdstrike.com" newer_than:365d                           │
│    - from:crowdstrike.com newer_than:365d                        │
│                                                                   │
│  ⚠️ PROBLEM #3: If Step 2 returns frame-security.com emails,     │
│     they won't match company tokens, so no extra queries added   │
│     BUT the damage is already done - they're in the results      │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│          STEP 4: Pre-Filter Obvious Non-Relevant                 │
│          (filter function in searchGmailMessages)                │
│                                                                   │
│  DETERMINISTIC LOGIC - Remove if:                                │
│  ✓ Google Calendar pure notifications                            │
│  ✓ Subject starts with "notification:", "reminder:", "alert:"    │
│  ✓ Vendor notification platforms (-notifications.com)            │
│    WITHOUT meaningful content                                    │
│  ✓ Strict automated senders (donotreply@, alerts@)              │
│    WITHOUT meaningful content                                    │
│  ✓ Unrelated patterns (receipt, invoice, shipping)               │
│                                                                   │
│  Uses helper: hasMeaningfulJobRelatedSubject()                   │
│  • Checks for keywords: opportunity, position, role,             │
│    interview, assignment, recruiter, hiring, etc.                │
│                                                                   │
│  ⚠️ PROBLEM #4: This filter is TOO LENIENT                       │
│     Emails pass through even if they just mention                │
│     the company name in passing or in comparisons                │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│         STEP 5: Classify with Fallback Logic                     │
│         (classifySearchCandidateFallback)                        │
│                                                                   │
│  DETERMINISTIC LOGIC - For each candidate:                       │
│  • Combine: subject + from + snippet → text                      │
│  • Check if company name appears in text                         │
│  • Check if sender domain matches company                        │
│  • Check if has interview keywords                               │
│  • Calculate confidence score                                    │
│  • Assign email type (INTERVIEW, RECRUITER, etc.)                │
│                                                                   │
│  Relevance logic:                                                │
│    related = companyNames in text OR roleTitle in text           │
│             OR domainRelated OR queryRelated                     │
│    interview = /interview|screening|meeting|.../.test(text)      │
│    relevant = related OR interview                               │
│    confidence = relevant ? (related && interview ? 0.88 : 0.72)  │
│                          : 0.22                                  │
│                                                                   │
│  ⚠️ PROBLEM #5: queryRelated flag is TRUE                        │
│     if the search query contained company name                   │
│     This means if Gmail API returned it from                     │
│     "CrowdStrike" query, it's marked as relevant                 │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│            STEP 6: AI Classification                             │
│            (classifyGmailEmails)                                 │
│                                                                   │
│  LLM CALL with structured output:                                │
│  • Model: gpt-4o-mini                                            │
│  • Input: array of candidates (messageId, subject, from,         │
│           snippet, date, senderDomain)                           │
│  • System prompt includes:                                       │
│    - "Classify each Gmail candidate for job-search CRM"          │
│    - STRICT FILTERING RULES (notifications, reminders, etc.)     │
│    - For general search: "Be EXTRA strict"                       │
│    - For company-specific: Target company context                │
│  • Output schema: messageId, isRelevant, confidence,             │
│                   emailType, reason                              │
│                                                                   │
│  ⚠️ PROBLEM #6: AI sees already-filtered candidates              │
│     The damage from broad Gmail query is already done            │
│     AI has to work harder to filter out false positives          │
│                                                                   │
│  ⚠️ PROBLEM #7: AI only sees snippet, not full body              │
│     May not have enough context to determine if mention          │
│     of "CrowdStrike" is relevant or just a comparison            │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│        STEP 7: Prefer Explicit Company Match                     │
│        (preferExplicitCompanyMatch)                              │
│                                                                   │
│  DETERMINISTIC LOGIC:                                            │
│  • Check if subject/from contains company name or domain         │
│  • If YES and fallback.isRelevant = true:                        │
│    → Use fallback classification (ignore AI)                     │
│  • Else:                                                         │
│    → Use AI classification                                       │
│                                                                   │
│  ⚠️ PROBLEM #8: This overrides AI's judgment                     │
│     If Gmail query matched "CrowdStrike" in body,                │
│     but AI correctly determined it's not relevant,               │
│     this logic might still keep it if company appears            │
│     anywhere in subject/from                                     │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│              STEP 8: Final Filtering                             │
│              (in searchGmailMessages)                            │
│                                                                   │
│  • No additional filtering for company-specific search           │
│  • Results are sorted by date                                    │
│  • Return candidates to UI                                       │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DISPLAY TO USER                               │
│              (All as "AI Suggested")                             │
└─────────────────────────────────────────────────────────────────┘
```

## Root Causes

### 1. **Overly Broad Gmail Search Query**
```typescript
// Current query:
"CrowdStrike newer_than:365d"

// Problem: Matches ANY email containing "CrowdStrike" anywhere:
// - "We use CrowdStrike for security"
// - "Unlike CrowdStrike, we offer..."
// - Email signature mentioning CrowdStrike
```

### 2. **Query-Related Flag Circular Logic**
```typescript
// In classifySearchCandidateFallback:
const queryRelated = companyTokens.some((token) => searchQuery.includes(token));
const related = ... || queryRelated;

// If searchQuery = "CrowdStrike newer_than:365d"
// And Gmail returned this email (even if false match)
// Then queryRelated = true → related = true → isRelevant = true
```

### 3. **Explicit Match Override**
```typescript
// In preferExplicitCompanyMatch:
if (hasExplicitIdentity && input.fallback.isRelevant) {
  return input.fallback; // Ignore AI classification
}

// Problem: Even if AI correctly identifies email as not relevant,
// this logic overrides it if company name appears anywhere
```

### 4. **Limited Context for AI**
- AI only sees: subject, from, snippet, senderDomain
- Doesn't see full email body
- Can't determine if "CrowdStrike" mention is:
  - About applying to CrowdStrike (relevant)
  - Comparison to CrowdStrike (not relevant)
  - Coincidental mention (not relevant)

## Examples of False Positives from Screenshots

1. **Frame Security Email**
   - Subject: "Your video interview with Frame Security"
   - Likely matches: Body mentions "CrowdStrike" in comparison
   - Why it passes: Gmail query matches → queryRelated=true → fallback.isRelevant=true

2. **Connecteam Emails**
   - Subjects about Connecteam interviews
   - Likely matches: Body or snippet mentions "CrowdStrike" 
   - Why it passes: Same circular logic

3. **BLOCKS Recruiting Email**
   - Not even related to tech interview
   - Why it passes: Probably mentions "CrowdStrike" in body

## Recommendations

### Option 1: Stricter Gmail Queries (Most Impact)
```typescript
// Instead of broad search:
"CrowdStrike newer_than:365d"

// Use more targeted:
from:@crowdstrike.com newer_than:365d
OR
"CrowdStrike" (interview OR recruiter OR offer) from:@crowdstrike.com newer_than:365d
OR
subject:"CrowdStrike" (interview OR recruiter) newer_than:365d
```

### Option 2: Remove queryRelated from Fallback Logic
```typescript
// Don't use the fact that Gmail returned it as evidence of relevance
const related = companyNames.some((name) => text.includes(name)) 
                || (role ? text.includes(role) : false) 
                || domainRelated;
// Remove: || queryRelated
```

### Option 3: Trust AI Classification More
```typescript
// Don't override AI with explicit match logic for company-specific searches
// Only use explicit match override for sender domain matching
```

### Option 4: Fetch Full Email Body for AI Classification
```typescript
// Before AI classification, fetch full body (not just snippet)
// This gives AI complete context to determine relevance
```

### Option 5: Add Post-AI Strict Filter
```typescript
// After AI classification, add strict filter:
// If isRelevant but senderDomain doesn't match company AND
// subject doesn't explicitly mention company in job context:
//   → Filter out
```

## Recommended Implementation Order

1. **Fix queryRelated logic** (Quick win - remove circular reasoning)
2. **Stricter Gmail queries** (Biggest impact - prevent false matches at source)
3. **Trust AI more** (Remove explicit match override for non-domain matches)
4. **Consider full body fetch** (Higher cost, but best accuracy)

## Impact Analysis

| Issue | Severity | Effort to Fix | Impact of Fix |
|-------|----------|---------------|---------------|
| Broad Gmail queries | HIGH | LOW | HIGH |
| queryRelated circular logic | HIGH | LOW | HIGH |
| Explicit match override | MEDIUM | LOW | MEDIUM |
| Limited AI context | LOW | HIGH | MEDIUM |
| Post-AI filtering | LOW | MEDIUM | LOW |
