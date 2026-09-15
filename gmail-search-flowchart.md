# Gmail Search - Detailed Decision Flow

## Visual Flowchart with All Decision Points

```
                                START
                                  │
                                  ▼
                    ┌─────────────────────────┐
                    │   User searches for     │
                    │   "CrowdStrike"         │
                    └───────────┬─────────────┘
                                │
                    ┌───────────▼─────────────┐
                    │ buildGmailSearchQueries │
                    │ (DETERMINISTIC)         │
                    └───────────┬─────────────┘
                                │
                    ┌───────────▼─────────────────────────────┐
                    │ Build company variants:                 │
                    │ • Original: "CrowdStrike"              │
                    │ • Remove .ai: N/A                      │
                    │                                         │
                    │ Build search queries:                  │
                    │ 1. "CrowdStrike newer_than:365d"       │
                    │ 2. "CrowdStrike" interview ...         │
                    │ 3. "CrowdStrike" (interview OR ...)    │
                    │                                         │
                    │ ⚠️  ISSUE: Too broad - matches ANY      │
                    │    email mentioning CrowdStrike        │
                    └───────────┬─────────────────────────────┘
                                │
                    ┌───────────▼─────────────┐
                    │   For each query:       │
                    │   Gmail API call        │
                    │   (maxResults: 50)      │
                    └───────────┬─────────────┘
                                │
            ┌───────────────────┼───────────────────┐
            │                   │                   │
            ▼                   ▼                   ▼
    ┌───────────┐      ┌───────────┐      ┌───────────┐
    │ Email A   │      │ Email B   │      │ Email C   │
    │ Frame     │      │ CrowdStrike│     │ Connecteam│
    │ Security  │      │ (Real)    │      │           │
    └─────┬─────┘      └─────┬─────┘      └─────┬─────┘
          │                  │                   │
          └──────────────────┴───────────────────┘
                             │
                 ┌───────────▼───────────┐
                 │ Filter suppressed    │
                 │ (USED/HIDDEN/IGNORED)│
                 └───────────┬───────────┘
                             │
                 ┌───────────▼────────────────────┐
                 │ Extract sender domains from    │
                 │ results for related queries    │
                 │ (buildRelatedSenderDomain...)  │
                 └───────────┬────────────────────┘
                             │
             ┌───────────────┼───────────────┐
             │               │               │
             ▼               ▼               ▼
    frame-security.com  crowdstrike.com  connecteam.com
             │               │               │
             ▼               ▼               ▼
        Does NOT match  MATCHES tokens   Does NOT match
        company tokens  → Add queries    company tokens
             │               │               │
             └───────────────┴───────────────┘
                             │
                 ┌───────────▼───────────┐
                 │ Additional queries    │
                 │ executed if needed    │
                 └───────────┬───────────┘
                             │
                 ┌───────────▼─────────────────────────┐
                 │ PRE-FILTER (DETERMINISTIC)          │
                 │                                     │
                 │ For each candidate, check:          │
                 └───────────┬─────────────────────────┘
                             │
                    ┌────────┴────────┐
                    ▼                 ▼
        ┌─────────────────────┐  ┌─────────────────────┐
        │ From calendar@?     │  │ Subject starts      │
        │ YES → Check if      │  │ with notification:? │
        │ interview content   │  │ YES → FILTER OUT    │
        │ NO → FILTER OUT     │  └─────────────────────┘
        └─────────────────────┘
                    │
                    ▼
        ┌─────────────────────────────────────┐
        │ From *-notifications.com domain?    │
        │ YES → Check meaningful content      │
        │   Has job keywords? → KEEP          │
        │   No job keywords? → FILTER OUT     │
        │ NO → Continue                       │
        └─────────────┬───────────────────────┘
                      │
                      ▼
        ┌─────────────────────────────────────┐
        │ From automated sender?              │
        │ (donotreply@, alerts@, etc.)        │
        │ YES → Check meaningful content      │
        │   Has job keywords? → KEEP          │
        │   No job keywords? → FILTER OUT     │
        │ NO → Continue                       │
        └─────────────┬───────────────────────┘
                      │
                      ▼
        ┌─────────────────────────────────────┐
        │ hasMeaningfulJobRelatedSubject?     │
        │ Checks for: opportunity, position,  │
        │ interview, assignment, recruiter... │
        │                                     │
        │ ⚠️  ISSUE: Only checks subject,      │
        │    not context of mention           │
        └─────────────┬───────────────────────┘
                      │
                      ▼
        ┌─────────────────────────────────────┐
        │ Unrelated patterns?                 │
        │ (receipt, invoice, shipping)        │
        │ YES and NO interview/recruiter      │
        │ → FILTER OUT                        │
        └─────────────┬───────────────────────┘
                      │
                      ▼
        ┌─────────────────────────────────────┐
        │ Candidates that pass pre-filter     │
        │ (Still includes Frame, Connecteam)  │
        └─────────────┬───────────────────────┘
                      │
                      ▼
        ┌─────────────────────────────────────┐
        │ classifySearchCandidateFallback     │
        │ (DETERMINISTIC)                     │
        │                                     │
        │ For each candidate:                 │
        └─────────────┬───────────────────────┘
                      │
        ┌─────────────▼──────────────────────────────────┐
        │ text = subject + from + snippet                │
        │ companyNames = ["crowdstrike"]                 │
        │ companyTokens = ["crowdstrike"]                │
        │ searchQuery = "CrowdStrike newer_than:365d"    │
        └─────────────┬──────────────────────────────────┘
                      │
        ┌─────────────▼──────────────────────────────────┐
        │ Check flags:                                   │
        │ • companyNames in text?                        │
        │ • roleTitle in text?                           │
        │ • domainRelated = senderDomain matches company │
        │ • queryRelated = searchQuery matches company   │
        │   ⚠️  ALWAYS TRUE for all results from         │
        │      "CrowdStrike" query!                      │
        └─────────────┬──────────────────────────────────┘
                      │
        ┌─────────────▼──────────────────────────────────┐
        │ related = companyNames in text OR              │
        │           roleTitle in text OR                 │
        │           domainRelated OR                     │
        │           queryRelated ✓ (TRUE for all!)       │
        │                                                │
        │ interview = /interview|screening|.../          │
        │                                                │
        │ relevant = related OR interview                │
        │                                                │
        │ ⚠️  RESULT: Almost everything marked relevant  │
        │    because queryRelated is always true         │
        └─────────────┬──────────────────────────────────┘
                      │
        ┌─────────────▼──────────────────────────────────┐
        │ Assign:                                        │
        │ • confidence: 0.88 (both) / 0.72 (one) / 0.22  │
        │ • emailType: INTERVIEW / RECRUITER / etc.      │
        │ • reason: "Matched ... search for CrowdStrike" │
        └─────────────┬──────────────────────────────────┘
                      │
                      ▼
        ┌─────────────────────────────────────────────────┐
        │ classifyGmailEmails (LLM CALL)                  │
        │ Model: gpt-4o-mini                              │
        │                                                 │
        │ Input for each candidate:                       │
        │ • messageId                                     │
        │ • subject                                       │
        │ • from                                          │
        │ • snippet (⚠️  Not full body!)                   │
        │ • date                                          │
        │ • senderDomain                                  │
        └─────────────┬───────────────────────────────────┘
                      │
        ┌─────────────▼───────────────────────────────────┐
        │ AI System Prompt:                               │
        │ "Classify each Gmail candidate for job CRM"     │
        │                                                 │
        │ STRICT FILTERING RULES:                         │
        │ • Calendar notifications → UNRELATED            │
        │ • System errors → UNRELATED                     │
        │ • Automated emails → UNRELATED                  │
        │ • Pure reminders → UNRELATED                    │
        │ • Non job-related meetings → UNRELATED          │
        │                                                 │
        │ For company-specific search:                    │
        │ "Target company: CrowdStrike"                   │
        │ "Keep recruiter messages from target company"   │
        │ "Filter pure notifications/reminders"           │
        │                                                 │
        │ ⚠️  AI must work hard to overcome bad Gmail     │
        │    query results                                │
        └─────────────┬───────────────────────────────────┘
                      │
        ┌─────────────▼───────────────────────────────────┐
        │ AI analyzes snippet only:                       │
        │                                                 │
        │ Frame Security email:                           │
        │ Snippet: "Reply above to continue with..."      │
        │ ❓ Does snippet show it's about Frame, not      │
        │    CrowdStrike? Maybe, maybe not.               │
        │                                                 │
        │ Connecteam email:                               │
        │ Snippet: "This is reminder... Connecteam..."    │
        │ ✓ AI can see it's Connecteam, not CrowdStrike   │
        │                                                 │
        │ ⚠️  Limited context means AI might miss some    │
        │    false positives                              │
        └─────────────┬───────────────────────────────────┘
                      │
        ┌─────────────▼───────────────────────────────────┐
        │ AI returns for each:                            │
        │ • isRelevant: true/false                        │
        │ • confidence: 0.0-1.0                           │
        │ • emailType: enum                               │
        │ • reason: string                                │
        └─────────────┬───────────────────────────────────┘
                      │
        ┌─────────────▼───────────────────────────────────┐
        │ preferExplicitCompanyMatch (DETERMINISTIC)      │
        │                                                 │
        │ For each candidate:                             │
        └─────────────┬───────────────────────────────────┘
                      │
        ┌─────────────▼───────────────────────────────────┐
        │ identityText = subject + from (lowercase)       │
        │ names = ["crowdstrike"]                         │
        │ domains = ["@crowdstrike.com"]                  │
        │                                                 │
        │ hasExplicitIdentity =                           │
        │   names in identityText OR                      │
        │   domains in identityText                       │
        └─────────────┬───────────────────────────────────┘
                      │
        ┌─────────────▼───────────────────────────────────┐
        │ Decision:                                       │
        │                                                 │
        │ IF hasExplicitIdentity AND                      │
        │    fallback.isRelevant:                         │
        │   → USE fallback (IGNORE AI!)                   │
        │ ELSE:                                           │
        │   → USE AI classification                       │
        │                                                 │
        │ ⚠️  ISSUE: This overrides AI's judgment         │
        │    Frame email might have "CrowdStrike" in      │
        │    subject if it's comparison, so AI's correct  │
        │    "not relevant" gets ignored                  │
        └─────────────┬───────────────────────────────────┘
                      │
                      ▼
        ┌─────────────────────────────────────────────────┐
        │ Final candidates list:                          │
        │ • Some correctly identified (CrowdStrike real)  │
        │ • Some false positives (Frame, Connecteam)      │
        │   that slipped through                          │
        └─────────────┬───────────────────────────────────┘
                      │
                      ▼
        ┌─────────────────────────────────────────────────┐
        │ Sort by date (newest first)                     │
        └─────────────┬───────────────────────────────────┘
                      │
                      ▼
        ┌─────────────────────────────────────────────────┐
        │ Return to UI                                    │
        │ Display all as "AI Suggested"                   │
        └─────────────────────────────────────────────────┘
                      │
                      ▼
        ┌─────────────────────────────────────────────────┐
        │ USER SEES:                                      │
        │ ✓ CrowdStrike real emails                       │
        │ ✗ Frame Security email                          │
        │ ✗ Connecteam emails                             │
        │ ✗ Other false positives                         │
        │                                                 │
        │ All marked "AI Suggested" with sparkle icon     │
        └─────────────────────────────────────────────────┘
```

## Key Decision Points Summary

| Step | Type | Decision Logic | Issue |
|------|------|----------------|-------|
| 1. Query Building | Deterministic | Build broad queries with company name | ⚠️ Too broad |
| 2. Gmail API | External | Return all matching emails | ⚠️ Returns false matches |
| 3. Related Domains | Deterministic | Extract domains, build more queries | ⚠️ Damage already done |
| 4. Pre-Filter | Deterministic | Filter obvious automation | ✓ Works well |
| 5. Fallback Classification | Deterministic | Check company/interview keywords + queryRelated flag | ⚠️ Circular logic |
| 6. AI Classification | LLM | Analyze snippet with context | ⚠️ Limited context |
| 7. Explicit Match | Deterministic | Override AI if company in subject/from | ⚠️ Too aggressive |
| 8. Final Sort | Deterministic | Sort by date | ✓ Works fine |

## Decision Logic: When AI is Used vs Deterministic

### Deterministic Logic (No LLM)
1. **Query building** - Pure string manipulation
2. **Pre-filtering** - Pattern matching on subject/from/domain
3. **Fallback classification** - Keyword matching + boolean logic
4. **Explicit match override** - String contains checks
5. **Domain extraction** - String parsing

### LLM Logic
1. **AI Classification** - Main intelligence layer
   - Input: metadata only (subject, from, snippet, date, domain)
   - Output: isRelevant, confidence, emailType, reason
   - Model: gpt-4o-mini
   - Prompt: Comprehensive rules about job email classification

### Hybrid (Deterministic overrides LLM)
1. **preferExplicitCompanyMatch**
   - If deterministic logic finds company name in subject/from
   - AND fallback says relevant
   - THEN ignore AI classification
   - ELSE use AI classification

## The Circular Reasoning Problem

```
Gmail Query: "CrowdStrike newer_than:365d"
       ↓
Gmail Returns: Email mentioning CrowdStrike anywhere
       ↓
classifySearchCandidateFallback:
  queryRelated = searchQuery.includes("crowdstrike") → TRUE
  related = ... OR queryRelated → TRUE
  relevant = related OR interview → TRUE
       ↓
Result: Email marked relevant BECAUSE Gmail returned it
        (even if Gmail made a mistake!)
```

This is circular logic because:
- We trust Gmail's matching → queryRelated = true
- We use queryRelated to determine relevance
- So anything Gmail returns is automatically considered relevant
- This defeats the purpose of having classification logic!
