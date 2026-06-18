---
name: product-owner
description: Protect product direction, optimize user workflows, and ensure features align with the Opportunity-first philosophy. Validate UX decisions against established principles.
---

# Product Owner Skill

## Purpose

Protect product direction, optimize user workflows, and ensure features align with the Opportunity-first philosophy. Validate UX decisions against established principles.

---

## When to Use

✅ **During feature planning**

- Before designing new workflows
- When adding navigation
- When changing page layouts

✅ **When making UX decisions**

- Page vs Drawer vs Modal choice
- Workflow step count
- Default behaviors

✅ **When implementing workflows**

- Multi-step processes
- AI automation flows
- Data entry forms

✅ **Before changing navigation/layout**

- Menu structure
- Page hierarchy
- Information architecture

---

## What This Skill Checks

### 1. Opportunity-First Hierarchy

**Validate:**

- ✅ Opportunity remains the primary workspace
- ✅ Interactions support opportunities (not standalone)
- ✅ Timeline shows opportunity journey
- ✅ Company is derived aggregation (not primary)

**Example Finding:**

```
🔴 CRITICAL: Hierarchy violation

Proposed feature: Standalone interactions page with full CRUD

Issue: Violates Opportunity-first principle
Interactions should always be in context of an opportunity

Recommendation: Add interactions via opportunity page
```

---

### 2. Page/Drawer/Modal Usage

**Component matrix:**

| Use Case        | Component | Why                |
| --------------- | --------- | ------------------ |
| Browse/Consume  | Drawer    | Preserves context  |
| Create/Workflow | Modal     | Focused task       |
| Main Workspace  | Page      | Full functionality |
| Quick Action    | Inline    | Minimal friction   |

**Check for violations:**

- ❌ Drawers for creation workflows
- ❌ Complex forms in drawers
- ❌ Nested modals
- ❌ Page-level complexity in modals

**Example Finding:**

```
🟡 MODERATE: Component usage violation

Proposed: Add interaction form in drawer

Issue: Creation workflows belong in modals (focused, closable)
Drawers should remain lightweight (view/consume only)

Recommendation: Use modal for "Add Interaction" workflow
```

---

### 3. Workflow Friction Points

**Count steps and clicks:**

- ❌ >3 confirmation prompts
- ❌ Multi-page wizards for simple tasks
- ❌ Required fields without defaults
- ❌ Manual data entry for automatable fields

**Measure cognitive load:**

- How many decisions does user make?
- How much context switching?
- How much typing required?
- Can we provide smart defaults?

**Example Finding:**

```
🟡 MODERATE: Workflow friction

Proposed flow for Gmail import:
1. Click "Import from Gmail"
2. Select account (manual)
3. Select folder (manual)
4. Select date range (manual)
5. Select emails (manual)
6. Review extraction
7. Confirm save

Issue: Steps 2-5 could have smart defaults

Recommendation:
- Default to primary account
- Default to recent (last 30 days)
- Auto-filter by company name
- Multi-select with smart suggestions
Reduces to 3 meaningful steps: Import → Review → Save
```

---

### 4. AI-First vs Manual-First

**Preferred pattern:**

```
AI extracts → Review UI → Accept/Edit → Save
(2 clicks: Import, Save)
```

**Anti-pattern:**

```
Search → Select → Configure → Parse → Review → Confirm → Save
(6+ clicks)
```

**Check for:**

- Can AI extract this automatically?
- Are we asking user to do AI's job?
- Is manual entry really necessary?
- Can we provide confidence-based defaults?

**Example Finding:**

```
🟡 MODERATE: Manual-first approach

Proposed: User manually enters interaction type, date, participants

Issue: Gmail calendar invites contain all this data

Recommendation:
- Parse calendar invite automatically
- Pre-fill all extractable fields
- User only reviews/edits
- Reduces 10+ fields to 1-click review
```

---

### 5. Preparation vs Data Management

**Validate:**

- ✅ Features help user win opportunities
- ✅ Interview prep is prominent
- ✅ Company research is accessible
- ✅ Past interactions inform prep

**Anti-patterns:**

- ❌ Data entry for its own sake
- ❌ Reports/dashboards that don't drive action
- ❌ Features that optimize tracking over winning

**Example Finding:**

```
🟢 MINOR: Feature focus check

Proposed: Detailed interaction statistics dashboard

Question: How does this help user prepare for next interview?

Consider: If this doesn't directly improve preparation,
deprioritize in favor of features that do.
```

---

## Output Format

### Finding Structure

```markdown
[Icon] [SEVERITY]: [Issue Title]

[Description of UX concern]

Proposed: [What was suggested]
Issue: [Why it violates principles]
Impact: [User experience consequence]

Recommendation: [Alternative approach]

[Optional: Example or mockup]
```

### Severity Levels

🔴 **CRITICAL** - Violates core principles

- Breaks Opportunity-first hierarchy
- Introduces major friction
- Contradicts product vision

🟡 **MODERATE** - Should reconsider

- Wrong component choice
- Unnecessary workflow steps
- Manual-first when AI-first is better

🟢 **MINOR** - Optimization opportunity

- Could reduce clicks
- Could improve defaults
- Could enhance UX

---

## Product Principles Checklist

Before approving UX changes, validate:

### Hierarchy

- [ ] Opportunity remains primary workspace
- [ ] Interactions in context of opportunities
- [ ] Timeline tells opportunity story
- [ ] Company page supports opportunities

### Component Usage

- [ ] Creation flows use modals (not drawers)
- [ ] Drawers stay lightweight (view only)
- [ ] Pages have full workspace functionality
- [ ] No nested modals

### Workflow Efficiency

- [ ] ≤3 meaningful user decisions
- [ ] Smart defaults provided
- [ ] AI extracts when possible
- [ ] Review > multi-step wizards

### Preparation Focus

- [ ] Feature helps user win
- [ ] Surfaces actionable insights
- [ ] Reduces prep time
- [ ] Past data informs future prep

---

## Common Issues & Fixes

### Issue: Drawer for Creation

**Bad:**

```
User clicks "Add Interaction"
→ Drawer slides in
→ Large form in drawer
→ Drawer feels cramped
```

**Good:**

```
User clicks "Add Interaction"
→ Modal appears (focused)
→ Form has space
→ Easy to cancel/close
```

---

### Issue: Manual-First Flow

**Bad:**

```
1. User clicks "Add from Gmail"
2. User selects account
3. User selects folder
4. User sets date range
5. User picks emails
6. User fills form from email
7. User saves
```

**Good:**

```
1. User clicks "Add from Gmail"
2. System auto-searches by company name
3. User reviews pre-filled form
4. User saves
```

---

### Issue: Wizard for Simple Task

**Bad:**

```
Step 1/4: Choose type
Step 2/4: Set date
Step 3/4: Add notes
Step 4/4: Review and save
```

**Good:**

```
Single screen:
- Type (defaulted to Interview)
- Date (defaulted to today)
- Notes (optional, inline)
[Save Button]
```

---

### Issue: Data Entry Over Preparation

**Bad Feature:**

```
"Detailed Interaction Analytics"
- View response times
- Track email volumes
- Generate monthly reports

→ Doesn't help user prepare for next interview
```

**Good Feature:**

```
"Interview Preparation View"
- Shows recent interactions
- Highlights topics discussed
- Surfaces unanswered questions
- Links to company research

→ Directly helps user prepare
```

---

## Example Session

**User:** "I want to add a standalone interactions list page"

**Product Owner Response:**

```markdown
## Product Direction Check

### 🔴 CRITICAL: Hierarchy Violation

Proposed: Standalone interactions page with full CRUD operations

Issue: Breaks Opportunity-first principle

- Interactions should always be in context of an opportunity
- Standalone view implies interactions are primary entities
- User loses opportunity context when viewing interaction

### Impact on User

Without opportunity context:

- User sees interaction but forgets which company
- Can't easily jump to opportunity for more context
- Breaks mental model of "opportunity as workspace"

### Alternative Approach

✅ Keep interactions within opportunity context:

Option 1: Interactions drawer (current)

- Triggered from opportunity timeline
- Shows interactions in context
- Lightweight, preserves opportunity view

Option 2: Filtered opportunity view

- Opportunity page with interaction filter
- Context preserved
- Can still see company/role info

Option 3: Dashboard widget

- "Upcoming Interactions" card on dashboard
- Links to parent opportunity
- Quick overview without losing context

Recommendation: Keep current drawer pattern, enhance if needed
```

---

## Integration with Other Skills

**Works with:**

- `architecture-guardian` - This validates UX, that validates technical
- `design-system-enforcer` - Ensures UX patterns use consistent UI
- `ai-workflow-optimizer` - Validates AI features align with product vision

**Consult before:**

- New feature design
- Navigation changes
- Workflow modifications
- Layout restructuring

**Consult after:**

- Implementation if patterns emerge
- User feedback if friction detected
- Competitive analysis

---

## Design Inspiration

### Learn from:

**Linear**

- Clean, keyboard-first
- Fast navigation
- Minimal clicks

**Notion Calendar**

- Timeline excellence
- Context preservation
- Smart defaults

**Superhuman**

- Keyboard shortcuts
- Speed-optimized
- Opinionated defaults

**Raycast**

- Command palette
- Extension model
- Quick actions

**Vercel**

- Deploy UX
- Clear feedback
- Progressive disclosure

### Avoid patterns from:

**Salesforce**

- Overwhelming UI
- Too many fields at once
- Complex navigation

**HubSpot**

- Feature bloat
- Unclear primary actions
- Over-engineered

**Jira**

- Wizard-heavy
- Slow workflows
- Nested complexity

**Legacy CRUD apps**

- Form-first instead of AI-first
- No smart defaults
- Manual data entry

---

## Product Decisions Already Made

**Reference these when evaluating proposals:**

### Hierarchy

- ✅ Opportunity is main workspace
- ✅ Interaction is supporting entity
- ✅ Timeline is source of truth

### Page Layout

- ✅ Interview Prep before Company Details
- ✅ Company Details supports prep, doesn't dominate
- ✅ Add Interaction is modal-based

### Workflows

- ✅ Optimize for preparation, not data management
- ✅ AI workflows: automate → review → accept
- ✅ Manual workflows: simplified input → preview → save
- ✅ Drawers remain lightweight (view/consume only)

### Navigation

- ✅ Opportunity page is primary
- ✅ Dashboard shows cross-opportunity insights
- ✅ Company page aggregates opportunities
- ✅ Interactions always in opportunity context

---

## Continuous Improvement

**Document new decisions:**

- Add to `.claude/CLAUDE.md`
- Add to `docs/product-philosophy.md`
- Update this skill with examples

**Challenge established patterns when:**

- User feedback indicates friction
- Better approach emerges
- Product vision evolves

**Validate assumptions:**

- Are these principles still serving users?
- Do new use cases require new patterns?
- Should any anti-patterns be reconsidered?

---

**Last Updated:** 2026-06-18
