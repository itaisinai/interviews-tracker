# Duplicate Contacts & Missing Participants - Bug Fix Summary

**Date:** 2026-06-21  
**Issues Fixed:**
1. Duplicate contacts with same name for same opportunity
2. Missing participant extraction from Gmail calendar invites

---

## Issue #1: Duplicate Contacts

### Problem
Multiple contacts with the same name were being created for the same opportunity, even though they were different people:

**Examples Found:**
- **Alta - Senior Software Engineer**
  - Rotem Zikorel (Founder & CEO at AI-IL) - WRONG PERSON
  - Rotem Zikorel (HR Recruiter at Migdal) - CORRECT PERSON
  
- **Reevol - Senior Full Stack Developer**
  - Asaf Halfon (Co-founder & CTO at Reevol) - CORRECT
  - Asaf Halfon (Tech Lead at Redis) - WRONG PERSON
  
- **Charm Security - Senior Full Stack**
  - Aviv Bar Niv (Founding Engineer at Charm) - CORRECT
  - Aviv Bar Niv (Staff Engineer at Google) - WRONG PERSON

### Root Cause
1. **No duplicate prevention:** Backend allowed creating multiple Person records with same name for same opportunity
2. **No company validation:** System didn't verify that researched person's current company matches the opportunity company
3. **Wrong LinkedIn profiles:** Person research found people with matching names but at different companies

### Solution Implemented

#### 1. Backend Validation (`apps/api/src/routes/people.ts`)
Added two layers of validation in the `POST /people` endpoint:

**A. Duplicate Check:**
```typescript
// Check if a person with the same name already exists for this opportunity
const existingPerson = await prisma.person.findFirst({
  where: { name, jobOpportunityId }
});

if (existingPerson) {
  return 409 Conflict with error message
}
```

**B. Company Validation:**
```typescript
// Validate that person's current company matches opportunity company
if (company && company !== opportunity.companyName) {
  // Extract from markdown format if needed
  const extractedCompany = company.match(/^\[([^\]]+)\]/)?.[1] || company;
  
  if (extractedCompany !== opportunity.companyName) {
    return 400 Bad Request with company mismatch error
  }
}
```

#### 2. Database Constraint (`prisma/schema.prisma`)
Added unique constraint to prevent duplicates at DB level:

```prisma
model Person {
  // ...
  @@unique([name, jobOpportunityId])
}
```

Migration: `add_person_opportunity_name_unique`

#### 3. Frontend Error Handling (`apps/web/src/components/person-research/person-research-flow.tsx`)
Updated save mutation to handle validation errors gracefully:

```typescript
onError: (error: any) => {
  if (error?.message?.includes("Company mismatch") || 
      error?.message?.includes("Duplicate contact")) {
    alert(error.message); // Show user-friendly error
  }
}
```

### Benefits
1. **Prevents future duplicates** - Can't create 2 contacts with same name for same opportunity
2. **Validates company match** - Ensures researched person actually works at the target company
3. **Better error messages** - Users see clear feedback when validation fails
4. **Data integrity** - Database constraint enforces rule even if app code bypassed

---

## Issue #2: Missing Participants from Gmail Calendar Invites

### Problem
When parsing Gmail calendar invitations, the system was extracting attendee email addresses from the ICS file but NOT displaying them as participants in the interaction.

**Example:**
- Email from Lihi Ehrlich with attendees: Lihi, Tomer
- Parsed interaction showed: Only "Itai Sinai" (the recipient)
- Expected: Should show "Lihi Ehrlich, Tomer" or all attendees

### Root Cause
The `parseIcsCalendar()` function correctly extracted attendees from the ICS `ATTENDEE:` fields, but `deriveInteractionFromStructuredEmail()` ignored them and only used `email.senderName`.

```typescript
// OLD CODE - only used sender
personName: email.senderName,
```

### Solution Implemented

#### Updated `deriveInteractionFromStructuredEmail()` (`apps/api/src/services/gmail/gmail-message-parser.ts`)

```typescript
// Extract participant names from calendar attendees
let participantNames: string | null = null;
if (email.calendar?.attendees && email.calendar.attendees.length > 0) {
  // Parse email addresses to extract names
  const attendeeNames = email.calendar.attendees
    .map(attendee => {
      // Try to extract name from "Name <email>" or just use email
      const mailbox = parseMailbox(attendee);
      return mailbox.name || mailbox.email?.split('@')[0];
    })
    .filter(Boolean);

  if (attendeeNames.length > 0) {
    participantNames = attendeeNames.join(', ');
  }
}

// Fallback to sender name if no attendees
const personName = participantNames || email.senderName;
```

### Benefits
1. **Shows all participants** - Attendees from calendar invites now appear in interaction
2. **Better context** - Users see who they're meeting with
3. **Supports multiple attendees** - Comma-separated list: "Lihi Ehrlich, Tomer Klein"
4. **Smart fallback** - Uses sender name if no attendees found

---

## Testing Recommendations

### Test Duplicate Prevention
1. Start dev server: `npm run dev`
2. Open an opportunity page
3. Try to research the same person twice for the same opportunity
4. **Expected:** Second save should fail with error message

### Test Company Validation
1. Research a person whose LinkedIn shows they work at Company A
2. Try to save them to an opportunity for Company B
3. **Expected:** Should fail with "Company mismatch" error

### Test Participant Extraction
1. Parse a Gmail calendar invitation with multiple attendees
2. Check the resulting interaction's `personName` field
3. **Expected:** Should show comma-separated list of attendees, not just sender

---

## Files Changed

### Backend
- `apps/api/src/routes/people.ts` - Added validation logic
- `apps/api/src/services/gmail/gmail-message-parser.ts` - Fixed participant extraction
- `prisma/schema.prisma` - Added unique constraint
- `prisma/migrations/*/add_person_opportunity_name_unique/migration.sql` - DB migration

### Frontend
- `apps/web/src/components/person-research/person-research-flow.tsx` - Better error handling

### Scripts
- `scripts/check-duplicates.ts` - Utility to find existing duplicates (can be deleted after cleanup)

---

## Follow-up Actions

### 1. Clean Up Existing Duplicates
Run the duplicate checker script to find and manually resolve existing duplicates:

```bash
npx tsx scripts/check-duplicates.ts
```

For each duplicate found:
1. Identify which person is correct (matches opportunity company)
2. Delete the incorrect person record(s)
3. Keep only the correct one

### 2. Run Database Migration
Apply the unique constraint migration:

```bash
# Development
npx prisma migrate dev

# Production
npx prisma migrate deploy
```

**WARNING:** Migration will fail if duplicates exist! Clean them up first.

### 3. Improve Person Research Flow (Future Enhancement)
Consider adding:
- Pre-validation before research: "This person works at Company X, but you're researching for Company Y"
- Better LinkedIn search: Pass company name to Exa search to improve relevance
- Duplicate warning: "A contact named X already exists. View existing?"

---

## Impact

### Before
- ❌ Multiple wrong people saved as contacts
- ❌ Manual cleanup required
- ❌ Confusing for users (which Rotem is correct?)
- ❌ Missing participants in calendar invites

### After
- ✅ Can't create duplicate names per opportunity
- ✅ System validates company match
- ✅ Clear error messages guide users
- ✅ All meeting participants visible
- ✅ Database enforces integrity

