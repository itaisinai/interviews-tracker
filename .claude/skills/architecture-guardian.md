# Architecture Guardian Skill

## Purpose

Validate architectural decisions, detect code quality issues, and ensure the codebase follows established layering patterns.

---

## When to Use

✅ **Before implementing new features**
- Check for existing similar implementations
- Validate layering approach
- Identify reusable patterns

✅ **During code review**
- Detect violations
- Find duplication
- Spot technical debt

✅ **When refactoring**
- Ensure boundaries are preserved
- Check for unintended coupling
- Validate extraction decisions

---

## What This Skill Checks

### 1. Code Duplication

**Look for:**
- Identical or near-identical functions across files
- Similar component structures (3+ instances)
- Repeated business logic
- Duplicate validation/transformation code

**Report:**
- File paths and line numbers
- Similarity percentage
- Consolidation recommendation

**Example Finding:**
```
🟡 MODERATE: Duplicate interaction validation

Found in:
- apps/api/src/controllers/interactions-controller.ts:45
- apps/api/src/controllers/opportunities-controller.ts:120
- apps/api/src/routes/interactions.ts:78

Recommendation: Extract to shared validation in lib/validators/
```

---

### 2. Package Boundary Violations

**Check:**
- ✅ Apps import from packages (allowed)
- ❌ Packages import from apps (VIOLATION)
- ❌ Circular dependencies between packages
- ❌ Prisma imports in frontend code

**Valid dependency direction:**
```
apps → packages
api-client → core, ai, integrations
ai → core
integrations → core
core → (none)
```

**Example Finding:**
```
🔴 CRITICAL: Package boundary violation

packages/ai/src/parser.ts imports from apps/api/src/lib/logger.ts

Fix: Move logger to @interviews-tracker/logger package or pass as dependency
```

---

### 3. Layering Violations

**Expected layers:**
```
HTTP Request → Route → Controller → Service → Repository → Prisma
                                  ↓
                            Integration (Gmail, OpenAI)
```

**Check for:**
- ❌ Prisma queries in routes
- ❌ Business logic in controllers
- ❌ HTTP concerns in services
- ❌ External API calls in repositories

**Example Finding:**
```
🔴 CRITICAL: Layering violation

apps/api/src/routes/opportunities.ts:145
Direct Prisma query in route handler

Fix: Move query to repository, call through service layer
```

---

### 4. Dead or Obsolete Code

**Identify:**
- Unused exports (functions, types, components)
- Deprecated endpoints still in routes
- Old response shapes no longer used
- Commented-out code blocks (>10 lines)
- TODO comments >6 months old

**Example Finding:**
```
🟢 MINOR: Dead code detected

apps/api/src/services/old-gmail-service.ts
Not imported anywhere, last modified 3 months ago

Recommendation: Delete if no longer needed
```

---

### 5. Missing Abstractions

**Detect patterns that should be abstracted:**
- Same sequence of operations repeated 3+ times
- Similar error handling across files
- Repeated type transformations
- Common validation patterns

**Example Finding:**
```
🟡 MODERATE: Missing abstraction

Pattern: prisma.interaction.findMany + promoteOverdueInteractionStatusForRead
Appears in 5 different repositories

Recommendation: Extract to shared repository utility
```

---

## Output Format

### Finding Structure

```markdown
[Severity Icon] [SEVERITY]: [Issue Title]

[Description of issue]

Location:
- file/path.ts:line
- file/path2.ts:line

Recommendation: [Specific action to take]

[Optional: Code example or alternative approach]
```

### Severity Levels

🔴 **CRITICAL** - Must fix before merging
- Security vulnerabilities
- Data integrity risks
- Breaking architectural principles
- Package boundary violations

🟡 **MODERATE** - Should address soon
- Significant duplication
- Missing important abstractions
- Performance concerns
- Unclear separation of concerns

🟢 **MINOR** - Nice to have
- Small duplication
- Dead code cleanup
- Documentation gaps
- Stylistic inconsistencies

---

## Validation Checklist

Run through this checklist for the changed files:

### Package Structure
- [ ] Check import statements for boundary violations
- [ ] Verify package dependency direction
- [ ] Look for circular dependencies

### Layering
- [ ] Routes only do HTTP wiring (no business logic)
- [ ] Controllers parse/validate, call services
- [ ] Services orchestrate, don't know about HTTP
- [ ] Repositories only do Prisma queries
- [ ] Integrations isolated from business logic

### Code Quality
- [ ] Search for duplicate function signatures
- [ ] Check for repeated code blocks (>10 lines similar)
- [ ] Look for unused exports/imports
- [ ] Find commented code (>10 lines)

### Abstractions
- [ ] Identify repeated patterns (3+ occurrences)
- [ ] Check for inline business logic that should be extracted
- [ ] Look for validation code that should be shared
- [ ] Find type transformations that repeat

---

## Common Issues & Fixes

### Issue: Direct Prisma in Routes

**Bad:**
```typescript
// routes/opportunities.ts
router.get('/:id', async (req, res) => {
  const opp = await prisma.jobOpportunity.findUnique({
    where: { id: req.params.id }
  });
  res.json(opp);
});
```

**Good:**
```typescript
// routes/opportunities.ts
router.get('/:id', asyncHandler(async (req, res) => {
  res.json(await getOpportunityHandler(req as AuthenticatedRequest));
}));

// controllers/opportunities-controller.ts
export async function getOpportunityHandler(request: AuthenticatedRequest) {
  return getOpportunity(request.params.id, request.auth.email);
}

// services/opportunity-service.ts
export async function getOpportunity(id: string, ownerEmail: string) {
  return getOpportunityRecord(id, ownerEmail);
}

// repositories/opportunity-repository.ts
export async function getOpportunityRecord(id: string, ownerEmail: string) {
  return prisma.jobOpportunity.findUnique({ where: { id, ownerEmail } });
}
```

---

### Issue: Package Importing from App

**Bad:**
```typescript
// packages/ai/src/parser.ts
import { logger } from '../../../apps/api/src/lib/logger';
```

**Good:**
```typescript
// packages/ai/src/parser.ts
export function parseJob(input: string, logger: Logger) {
  // Pass logger as dependency
}

// OR: Move logger to its own package
import { logger } from '@interviews-tracker/logger';
```

---

### Issue: Duplicate Validation

**Bad:**
```typescript
// File 1
if (!input.date || !input.type || !input.status) {
  throw new Error('Missing required fields');
}

// File 2
if (!input.date || !input.type || !input.status) {
  throw new Error('Missing required fields');
}

// File 3
if (!input.date || !input.type || !input.status) {
  throw new Error('Missing required fields');
}
```

**Good:**
```typescript
// packages/core/src/domain/contracts.ts
export const interactionInputSchema = z.object({
  date: z.string().datetime(),
  type: interactionTypeSchema,
  status: interactionStatusSchema,
  // ...
});

// Usage
const input = interactionInputSchema.parse(rawInput);
```

---

## Example Session

**User:** "I'm about to add a new feature to list interactions by company"

**Architecture Guardian Response:**

```markdown
## Architecture Guardian Check

### ✅ Existing Pattern Found

Similar functionality exists:
- `listOpportunityInteractionsHandler` in opportunities-controller.ts
- `listInteractionRecords` in interaction-repository.ts

Recommendation: Follow the same layering pattern:
1. Route in routes/companies.ts → handler
2. Controller in companies-controller.ts → service
3. Service calls existing interaction-repository functions

### ✅ No Package Issues

All imports follow correct dependency direction.

### 🟡 Consider: Deduplication Opportunity

If this creates a 3rd "list interactions with filters" pattern, 
consider extracting a shared repository function:
`listInteractionRecords(filters: InteractionFilters, ownerEmail: string)`

Proceed with implementation following established patterns.
```

---

## Integration with Other Skills

**Works with:**
- `design-system-enforcer` - Checks UI layer while this checks logic layer
- `system-improvement-reviewer` - Includes this as one validation step
- `product-owner` - This validates technical, product-owner validates UX

**Before running:**
- Understand what files changed
- Know what feature is being implemented
- Review `.claude/CLAUDE.md` principles

**After running:**
- Address critical findings immediately
- Schedule moderate findings
- Note minor findings for bulk cleanup

---

## Continuous Improvement

**Add new checks when you notice:**
- Recurring violations
- Missed patterns
- New anti-patterns emerging

**Update this skill when:**
- Architecture principles change
- New layers are introduced
- Package structure evolves

---

**Last Updated:** 2026-06-18
