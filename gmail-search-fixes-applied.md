# Gmail Search Fixes - Implementation Summary

## Date: 2026-09-15

## Problem
Gmail search for "CrowdStrike" was returning many non-relevant emails from other companies (Frame Security, Connecteam, BLOCKS, etc.) because:
1. Gmail queries were too broad
2. Circular logic in classification
3. AI classification was being overridden incorrectly
4. AI prompt could be more explicit about false positives

## Fixes Applied

### ✅ Fix #1: Remove Circular queryRelated Logic
**File:** `apps/api/src/services/gmail/gmail-message-parser.ts`

**What Changed:**
- Removed `queryRelated` flag that was causing circular reasoning
- Removed logic: `const queryRelated = companyTokens.some((token) => searchQuery.includes(token))`
- Removed from `related` calculation: `|| queryRelated`
- Removed from reason messages mentioning "Matched a related sender-domain search"

**Why:**
The system was using "Gmail returned this email" as proof of relevance, which is circular logic. Now only checks:
- Company name in actual email content (subject/from/snippet)
- Role title in content
- Sender domain matches company

**Impact:** 🔴 HIGH - Eliminates false positives from being auto-marked relevant

---

### ✅ Fix #2: Stricter Gmail Search Queries
**File:** `apps/api/src/services/gmail/gmail-message-parser.ts` (buildGmailSearchQueries function)

**What Changed:**
Before:
```
CrowdStrike newer_than:365d
"CrowdStrike" interview newer_than:365d
```

After:
```
"CrowdStrike" (interview OR recruiter OR assignment OR offer OR rejection OR application OR position OR role OR hiring) newer_than:365d
subject:"CrowdStrike" (interview OR recruiter) newer_than:365d
```

**Why:**
- Removed bare company name query that matches ANY mention
- Now REQUIRES company name + job-related keywords
- Added subject-scoped query for stronger signal
- Prevents matching emails that just mention company in body text, comparisons, or signatures

**Impact:** 🔴 HIGH - Prevents false matches at the source (Gmail API level)

---

### ✅ Fix #3: Trust AI Classification, Only Override for Domain Matches
**File:** `apps/api/src/services/gmail/gmail-search.ts` (preferExplicitCompanyMatch function)

**What Changed:**
Before:
```typescript
const hasExplicitIdentity = 
  names.some((name) => identityText.includes(name)) || 
  domains.some((domain) => identityText.includes(`@${domain}`));

if (hasExplicitIdentity && input.fallback.isRelevant) {
  return input.fallback; // Override AI
}
```

After:
```typescript
const hasDomainMatch = domains.some((domain) => 
  fromLower.includes(`@${domain}`)
);

if (hasDomainMatch && input.fallback.isRelevant) {
  return input.fallback; // Override AI ONLY for domain match
}
```

**Why:**
- Only override AI when sender is from company's verified domain (strong signal)
- Don't override when company name just appears in subject/from (could be comparison, mention, etc.)
- Let AI's judgment prevail for non-domain matches

**Impact:** 🟡 MEDIUM - Prevents overriding AI's correct "not relevant" decisions

---

### ✅ Fix #4: Improve AI Classification Prompt
**File:** `apps/api/src/services/ai/ai-parser-service.ts` (classifyGmailEmails function)

**What Changed:**
Enhanced company-specific search prompt with:
```
- CRITICAL: Check if email is ABOUT applying/interviewing at the target company
- vs. just MENTIONING the target company in passing, comparisons, or examples

Mark as UNRELATED if:
- Email is about a DIFFERENT company that just mentions target company
  Example: 'Interview with CompanyX' where body says 'unlike [TargetCompany]...'
- Email from different company's recruiter/domain mentioning target in comparison
- Email signature, footer, or body text casually mentions target company

Mark as RELEVANT only if:
- Email is FROM the target company's domain (strong signal)
- Email subject/body is clearly about YOUR application/interview at target company
- Recruiter is discussing target company opportunity with you specifically
```

**Why:**
- Makes explicit the distinction between "about company" vs "mentions company"
- Gives AI clear examples of false positive patterns
- Emphasizes checking sender domain as strong signal

**Impact:** 🟡 MEDIUM - Helps AI better distinguish false positives

---

## Expected Results

### Before Fixes:
Search "CrowdStrike" returns:
- ✅ Real CrowdStrike emails
- ❌ Frame Security interview (mentions CrowdStrike in comparison)
- ❌ Connecteam interviews (mentions CrowdStrike in body)
- ❌ BLOCKS recruiting (mentions CrowdStrike somewhere)

### After Fixes:
Search "CrowdStrike" returns:
- ✅ Real CrowdStrike emails (from @crowdstrike.com or subject clearly about CrowdStrike + job keywords)
- ✅ Fewer false positives from Gmail queries (stricter search)
- ✅ AI correctly filters remaining false positives (better prompt + no override)
- ✅ Only domain-matched emails bypass AI filtering

## Testing Recommendations

1. **Test Case: Frame Security Email**
   - Expected: Should NOT appear (different company, just mentions CrowdStrike)
   - Verification: Gmail query won't match it (requires job keywords), or AI filters it out

2. **Test Case: Connecteam Email**
   - Expected: Should NOT appear (different company)
   - Verification: Gmail query won't match, or AI filters it out

3. **Test Case: Real CrowdStrike Recruiter**
   - Expected: SHOULD appear
   - Verification: Matches stricter query, passes AI classification

4. **Test Case: CrowdStrike Domain Email**
   - Expected: SHOULD appear (from @crowdstrike.com)
   - Verification: Matches domain query, domain override preserves it

## Rollback Plan

If issues occur:
1. All changes are in 3 files:
   - `apps/api/src/services/gmail/gmail-message-parser.ts`
   - `apps/api/src/services/gmail/gmail-search.ts`
   - `apps/api/src/services/ai/ai-parser-service.ts`

2. Git revert:
   ```bash
   git diff HEAD -- apps/api/src/services/gmail/gmail-message-parser.ts
   git diff HEAD -- apps/api/src/services/gmail/gmail-search.ts
   git diff HEAD -- apps/api/src/services/ai/ai-parser-service.ts
   ```

## Monitoring

After deployment, monitor:
- User reports of missing relevant emails (false negatives)
- User reports of irrelevant emails still appearing (false positives)
- Gmail search result counts (should be lower but not zero)
- AI classification patterns (isRelevant true/false ratios)

## Notes

- TypeCheck passes (unrelated errors in notification module exist but predate this change)
- No test suite exists for Gmail search, so manual testing required
- Changes are backward compatible (no API changes)
- AI token usage unchanged (same number of candidates, better prompt)

## Files Modified

1. `apps/api/src/services/gmail/gmail-message-parser.ts` - 2 changes (query building, circular logic)
2. `apps/api/src/services/gmail/gmail-search.ts` - 1 change (explicit match logic)
3. `apps/api/src/services/ai/ai-parser-service.ts` - 1 change (AI prompt enhancement)

Total: 4 distinct changes across 3 files
