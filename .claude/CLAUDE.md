# Interviews Tracker - Claude Operating System

This document provides the primary context for Claude Code sessions working on this repository. It captures product philosophy, UX architecture, engineering principles, and workflow patterns to ensure consistency across sessions.

---

## 🚨 CRITICAL SAFETY PROTOCOLS 🚨

**READ THIS FIRST - These rules override all other instructions.**

### Database Safety

**NEVER run these commands without explicit user permission:**

❌ `prisma migrate reset` - DELETES ALL DATA  
❌ `prisma db push --force-reset` - DELETES ALL DATA  
❌ `prisma db execute` with DROP/TRUNCATE/DELETE - DESTRUCTIVE  
❌ Any SQL that starts with `DROP DATABASE`, `TRUNCATE`, `DELETE FROM` without WHERE

**ALWAYS check before database operations:**

1. **Verify DATABASE_URL target:**
   ```bash
   # Check if it's a cloud database (Neon, Supabase, RDS, etc.)
   echo $DATABASE_URL | grep -E "(neon|supabase|aws|azure|planetscale)"
   # If match found → STOP and ask user
   ```

2. **For migrations:**
   - ✅ `prisma migrate deploy` - Safe (applies migrations)
   - ✅ `prisma migrate dev` - Ask first (creates new migration)
   - ❌ `prisma migrate reset` - NEVER without explicit permission

3. **Before any destructive DB operation:**
   - Show the user what DATABASE_URL you're targeting
   - Ask: "This will modify [production/staging/local] database. Proceed?"
   - Wait for explicit "yes"

### Git Safety

**MUST ask user before:**

- ✅ Creating commits (`git commit`)
- ✅ Pushing to remote (`git push`)
- ✅ Force pushing (`git push --force`)
- ✅ Deleting branches (`git branch -D`)
- ✅ Resetting commits (`git reset --hard`)
- ✅ Rebasing (`git rebase`)
- ✅ Stashing with `--all` or `--include-untracked`

**Show the user:**
- What files will be committed
- The commit message
- What branch you're on
- Where you're pushing to

**Format:**
```
About to commit on branch: [branch-name]
Files:
  - [file1]
  - [file2]

Commit message: [message]

Push to origin? [yes/no]
```

### Dependency Safety

**MUST ask before:**

- Installing new npm packages
- Upgrading major versions of dependencies
- Removing dependencies
- Running `npm update` or `npm outdated`
- Modifying package.json scripts

**Show the user:**
- What package and version
- Why it's needed
- Potential impact

### File Safety

**NEVER delete without permission:**

- Migration files (even if they look wrong)
- .env files
- Configuration files (.claude/*, tsconfig.json, etc.)
- Any file in `/prisma/migrations/`

**ALWAYS create backups before:**

- Modifying schema.prisma
- Editing critical config files
- Running codemod/refactor scripts on >10 files

### Environment Detection

**ALWAYS verify environment before destructive operations:**

```bash
# Check for production indicators
if [[ "$DATABASE_URL" == *"production"* ]] || \
   [[ "$DATABASE_URL" == *".aws."* ]] || \
   [[ "$DATABASE_URL" == *"neon.tech"* ]]; then
  echo "⚠️  PRODUCTION DATABASE DETECTED"
  echo "Operation blocked. Ask user for explicit permission."
  exit 1
fi
```

### Verification Checklist

**Before any major change, verify:**

1. [ ] Is this a production/staging/cloud database?
2. [ ] Have I shown the user what will change?
3. [ ] Did the user explicitly approve?
4. [ ] Is there a backup/snapshot available?
5. [ ] Can this operation be rolled back?
6. [ ] Have I tested this on a small subset first?

### Auto-Reject Operations

**These operations are BLOCKED unless user types them explicitly:**

- `rm -rf` anywhere near project files
- `DROP DATABASE`
- `TRUNCATE TABLE` without WHERE clause
- `git push --force` to main/master
- Modifying `.git/` directory directly
- Disabling TypeScript checks or tests

### When In Doubt

**ASK THE USER.**

If you're unsure whether an operation is safe:
1. Stop immediately
2. Explain what you were about to do
3. Explain the risks
4. Ask for explicit permission
5. Wait for "yes" or "proceed"

**"Better safe than sorry" is the rule.**

---

## Product Vision & Philosophy

### Core Mental Model

**Opportunity is the primary workspace.**

- Everything centers around winning job opportunities
- Interactions, notes, tasks, and compensation support the opportunity
- The timeline tells the story of each opportunity's journey

**Preparation over data entry.**

- Optimize for interview prep, not record-keeping
- Surface actionable insights, not just data
- Make it easy to review what matters before each interaction

**AI automation as the default path.**

- Prefer: AI extracts → user reviews → user accepts
- Avoid: User searches → selects → configures → reviews → confirms
- Confidence-based flows: high confidence = auto-apply, low confidence = suggest

### Product Principles

1. **Opportunity-first hierarchy**
   - Opportunity page = main workspace
   - Interaction = supporting entity
   - Company = derived aggregation

2. **Workflow optimization**
   - Reduce clicks and cognitive load
   - Eliminate unnecessary confirmation steps
   - Default to smart automation with review

3. **Timeline as source of truth**
   - Chronological order shows the journey
   - Past interactions inform future preparation
   - Clear status transitions

---

## UX Architecture

### Component Usage Rules

| Use Case            | Component     | Why                                 |
| ------------------- | ------------- | ----------------------------------- |
| **Browse/Consume**  | Drawer        | Lightweight, preserves page context |
| **Create/Workflow** | Modal         | Focused task, easily closable       |
| **Main Workspace**  | Page          | Full functionality, persistent      |
| **Quick Action**    | Inline/Button | Minimal friction                    |

### Anti-Patterns to Avoid

❌ **Drawers for creation workflows**

- Drawers should be lightweight (view/consume only)
- Creation needs focus → use modals

❌ **Wizard-heavy experiences**

- Multi-step wizards create friction
- Prefer single-screen forms with smart defaults

❌ **Nested modals**

- Creates confusion and poor UX
- Use page transitions instead

❌ **Full CRUD in drawers**

- Drawers are not mini-pages
- Complex editing belongs on pages

### Workflow Patterns

**AI-First Automation:**

```
Parse/Extract → AI Analysis → Show Review UI → User Accepts/Edits → Save
```

**Manual Fallback:**

```
Simple Input Form → Preview → Save
```

**Bulk Operations:**

```
Select Multiple → Choose Action → Confirm → Execute
```

### Page Layout Decisions

✅ **Interview Preparation before Company Details**

- What helps you win comes first
- Company research supports prep, doesn't dominate

✅ **Add Interaction is modal-based**

- Focused workflow with clear completion
- Not buried in a drawer

✅ **Timeline prominence**

- Central to opportunity page
- Shows interaction history clearly

---

## Engineering Principles

### Core Values

**Plan before implementation.**

- Understand the problem space
- Consider alternatives
- Document decisions

**Prefer deletion over addition.**

- Remove unused code immediately
- Question every new dependency
- Simplify before extending

**Prefer reuse over duplication.**

- Check for existing patterns first
- Extract when you see 3+ uses
- Consolidate similar implementations

**Prefer extension over replacement.**

- Build on existing patterns
- Avoid rewriting working code
- Refactor incrementally

### Code Quality Standards

**Favor design-system primitives.**

- Use `@interviews-tracker/design-system` components
- Don't create one-off UI components
- Follow semantic token patterns

**Favor composability.**

- Small, focused components
- Clear props interfaces
- Easy to test and reuse

**Favor consistency.**

- Follow established patterns
- Match existing code style
- Use consistent naming

### Required Pre-Implementation Checks

Before implementing any feature:

1. **Check for existing solutions**
   - Similar components/utilities already exist?
   - Can existing code be extended?
   - Is there a pattern to follow?

2. **Validate against principles**
   - Does this fit the product philosophy?
   - Is the UX pattern appropriate?
   - Will this create technical debt?

3. **Plan the approach**
   - What needs to change?
   - What are the risks?
   - How will you test it?

### Required Final Review

Before completing substantial work, perform a **System Improvement Review**:

**Check for:**

- ✅ Duplicate code that should be consolidated
- ✅ Duplicate UI patterns (3+ uses = extract)
- ✅ Design-system extraction opportunities
- ✅ Documentation updates needed
- ✅ Technical debt introduced
- ✅ Dead code to remove
- ✅ Backend cleanup opportunities
- ✅ AI workflow simplification opportunities

**Use the `system-improvement-reviewer` skill** to automate this check.

---

## Tech Stack & Architecture

### Quick Reference

**See detailed documentation:**

- `docs/architecture.md` - Layering, boundaries, data flow
- `docs/design-system.md` - Component structure, tokens, Storybook
- `docs/refactor-roadmap.md` - Planned improvements

### Architecture Layers

```
HTTP Request → Route → Controller → Service → Repository → Prisma
                                  ↓
                            Integration (Gmail, OpenAI, etc)
```

**Key Rules:**

- Routes: HTTP wiring only
- Controllers: Parse requests, validate inputs
- Services: Business orchestration
- Repositories: Prisma queries only
- Integrations: External clients only

### Package Boundaries

```
apps → packages (one-way dependency)

@interviews-tracker/core (domain types, enums)
@interviews-tracker/ai (AI contracts, prompts)
@interviews-tracker/integrations (Gmail, enrichment DTOs)
@interviews-tracker/api-client (browser-safe API client)
```

**Never:**

- Import from `apps/` in `packages/`
- Import Prisma in frontend
- Mix business logic in routes

---

## Design System Governance

### Extraction Criteria (3+ Rule)

**Extract to design-system when:**

- ✅ Pattern appears 3+ times across codebase
- ✅ Pattern is likely to be reused
- ✅ Component is business-agnostic (no Opportunity/Interaction/Company logic)

**Keep local when:**

- ❌ Single use, unlikely to repeat
- ❌ Tightly coupled to specific feature
- ❌ Rapid experimentation phase

### Extraction Process

1. **Identify the pattern**
   - Same visual style across 3+ places
   - Similar props/behavior
   - Could be generalized

2. **Create in design-system**
   - New folder: `packages/design-system/src/components/<name>/`
   - Component file: `<name>.tsx`
   - Story file: `<name>.stories.tsx`
   - Export: `index.ts`

3. **Use semantic tokens**
   - No hardcoded colors/spacing
   - Reference `tokens.css` variables
   - Follow existing token patterns

4. **Update consumers**
   - Replace duplicates with design-system import
   - Remove local implementations
   - Test visual regressions

### Current Design System Components

**Primitives available:**

- Button, IconButton, Badge
- Card, Modal, Drawer
- Input, Textarea, Select, FormField
- DataTable, Calendar
- LoadingState, Spinner
- MaterialIcon

**Extraction candidates** (check before duplicating):

- StatusBadge (status indicators)
- TimelineItem (interaction timeline)
- DetailRow (key-value display)
- EmptyState (no-data states)
- ParticipantRow (person display)

---

## AI Workflow Patterns

### Confidence-Based Automation

**High Confidence** (80%+): Auto-apply with notification

```
Extract data → Apply changes → Show "Applied [X]" toast → Allow undo
```

**Medium Confidence** (50-80%): Suggest with easy accept

```
Extract data → Show review UI → Pre-filled with suggestion → User accepts/edits
```

**Low Confidence** (<50%): Provide starting point

```
Extract partial data → Show form with fields → User completes
```

### Review-Before-Save Pattern

**Always show:**

- What was extracted/parsed
- Source of data (which email, which text)
- Confidence/reasoning (when applicable)

**User controls:**

- Edit any field before saving
- Reject and try different source
- Save as-is with one click

### Source Traceability

**For AI-extracted data:**

- Link to source email (`gmailMessageId`)
- Store extraction metadata
- Allow re-parsing from source
- Show "Imported from Gmail" badges

**For manual data:**

- Track creation date/user
- No false attribution

### AI Workflow Anti-Patterns

❌ **Over-confirming**

- Don't ask "Are you sure?" multiple times
- Single review step is enough

❌ **Hiding the source**

- Always show where data came from
- Allow jumping back to source

❌ **All-or-nothing parsing**

- Partial results are valuable
- Let user fill gaps manually

---

## Session Workflow

### Starting a Session

1. **Read this CLAUDE.md** - Understand context
2. **Check existing documentation** - `docs/` folder
3. **Understand the request** - Clarify ambiguity
4. **Check skills** - Use `.claude/skills/` for validation

### During Implementation

1. **Use architecture-guardian skill** - Before implementing
2. **Use product-owner skill** - For UX decisions
3. **Use design-system-enforcer skill** - When creating UI
4. **Use ai-workflow-optimizer skill** - For AI features

### Before Completing Work

1. **Run system-improvement-reviewer skill** - Comprehensive check
2. **Update documentation** - If patterns changed
3. **Commit with clear messages** - Explain why, not just what
4. **Test the feature** - Don't just compile

### When You Discover Patterns

**Document them:**

- Add to this CLAUDE.md if cross-cutting
- Add to `docs/engineering-decisions.md` if architectural
- Add to `docs/ux-patterns.md` if UI/workflow
- Add to `docs/product-philosophy.md` if product direction

**Suggest improvements:**

- Update relevant skill in `.claude/skills/`
- Flag design-system extraction opportunities
- Recommend consolidation

---

## Local Product Verification

For any task that changes visual UI, interaction flows, routing, user-facing behavior, or internal logic that may affect an existing user flow, Claude must perform at least one local browser verification before considering the task complete.

This is required even if typecheck, lint, and tests pass.

### When Required

Run local verification for changes involving:

- UI layout or styling
- drawers, modals, pages, navigation
- forms
- timeline behavior
- Gmail import flow
- opportunity page behavior
- interaction details
- company research
- person/contact research
- API contract changes that affect frontend behavior
- refactors that may affect user-facing flows

### Expected Process

1. Start the local development environment using the existing project scripts.
2. Use the existing dev user / dev authentication flow.
3. Navigate to the relevant page.
4. Exercise the changed flow manually in the browser.
5. Verify the happy path still works.
6. Check for obvious visual regressions.
7. Check the browser console for errors.
8. Check the terminal/server logs for errors.
9. Summarize what was verified.

### Minimum Verification Standard

At minimum, Claude must verify one representative path.

Examples:

- Opportunity UI change:
  - open an existing opportunity page
  - confirm header, preparation section, company details, timeline render correctly
  - click an interaction and verify drawer opens

- Interaction drawer change:
  - open opportunity
  - click timeline interaction
  - verify drawer content, actions, fullscreen button, close behavior

- Add interaction flow:
  - open opportunity
  - click Add Interaction
  - verify modal opens
  - test manual creation or Gmail import path depending on the change

- Gmail import change:
  - open Add Interaction modal
  - start Gmail import with dev user
  - verify candidate/review/accept flow

### Completion Requirement

A task is not complete until the final summary includes:

- local environment command used
- page/route visited
- dev user/auth method used
- flow tested
- result
- any issues found or explicitly not found

If local verification cannot be completed, Claude must clearly say why and what remains unverified.

---

## Backend Review Guidance

Before implementing frontend-only workarounds, check:

### API Design

- Is this really a frontend concern?
- Should the backend provide this data/logic?
- Are we working around a backend gap?

### Dead Code Audit

- Deprecated endpoints still in routes?
- Old response shapes no longer used?
- Duplicate endpoints doing similar things?

### Type Safety

- Do DTOs match actual responses?
- Optional fields correctly typed?
- null vs undefined handled consistently?

### Performance

- N+1 queries happening?
- Missing database indexes?
- Over-fetching data?

---

## Design Inspiration

### Learn from:

- **Linear** - Clean, fast, keyboard-first
- **Notion Calendar** - Timeline excellence
- **Superhuman** - Keyboard shortcuts, speed
- **Raycast** - Command palette, extensions
- **Vercel** - Deploy UX, clear feedback

### Avoid patterns from:

- **Salesforce** - Overwhelming UI, too many fields
- **HubSpot** - Feature bloat, complex navigation
- **Jira** - Over-engineered, slow
- **Legacy CRUD apps** - Form-heavy, no intelligence

---

## System Evolution Protocol

This repository improves itself through active use.

### When You Discover Recurring Patterns

**Step 1: Document the Pattern**

- Add to this CLAUDE.md if cross-cutting
- Add to `docs/engineering-decisions.md` if architectural
- Add to `docs/ux-patterns.md` if UI/workflow

**Step 2: Update Skills**
If a pattern could be automated/validated:

- Update relevant skill in `.claude/skills/`
- Add pattern detection logic
- Include examples

**Step 3: Suggest Extraction**
If you notice duplicate code 3+ times:

- Recommend design-system extraction
- Recommend shared utility extraction
- Recommend repository pattern extraction

**Step 4: Flag for Human Review**
Add to session summary:

- "Suggested CLAUDE.md updates: [...]"
- "Potential skill improvements: [...]"
- "Design system opportunities: [...]"

### Evolution Triggers

**After each substantial feature:**

- Did we introduce new patterns?
- Should we document new decisions?
- Can we simplify something?

**When hitting friction:**

- Is there missing documentation?
- Should there be a new skill?
- Do principles need updating?

**Monthly review:**

- What patterns emerged?
- What documentation is stale?
- What skills need refinement?

---

## Quick Reference Card

### Before Implementing

- [ ] Read this CLAUDE.md
- [ ] Check `docs/architecture.md`
- [ ] Run `architecture-guardian` skill
- [ ] Run `product-owner` skill (for UX)

### During Implementation

- [ ] Follow established patterns
- [ ] Use design-system components
- [ ] Add tests for new logic
- [ ] Keep commits atomic

### Before Completing

- [ ] Run `system-improvement-reviewer` skill
- [ ] Update docs if needed
- [ ] Check for duplication
- [ ] Test the feature

### AI Features Checklist

- [ ] Run `ai-workflow-optimizer` skill
- [ ] Implement confidence-based flows
- [ ] Show source traceability
- [ ] Allow review before save
- [ ] Handle partial results gracefully

---

**Last Updated:** 2026-06-18

**For detailed skill documentation, see:** `.claude/skills/README.md`
