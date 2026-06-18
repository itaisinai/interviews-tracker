# Design System Enforcer Skill

## Purpose

Ensure UI consistency, identify reusable patterns, and enforce design system best practices. Prevent one-off components and promote extraction to `@interviews-tracker/design-system`.

---

## When to Use

✅ **When creating or modifying UI components**
- Before implementing new UI
- When copying/pasting component code
- When styling components

✅ **Before completing frontend work**
- Check for extraction opportunities
- Validate token usage
- Ensure consistency

✅ **During component extraction discussions**
- Evaluate extraction criteria
- Plan migration approach

---

## What This Skill Checks

### 1. Duplicate UI Patterns (3+ Uses Rule)

**Detection criteria:**
- Same visual style across 3+ files
- Similar component structure
- Repeated layout patterns
- Identical prop interfaces

**Example Finding:**
```
🟡 MODERATE: Duplicate status badge pattern

Found in:
- apps/web/src/components/opportunity-card.tsx:45
- apps/web/src/components/interaction-summary.tsx:78
- apps/web/src/components/company-header.tsx:32
- apps/web/src/pages/dashboard-page.tsx:156

Pattern: Badge with color based on status enum

Recommendation: Extract to design-system/components/status-badge/
```

---

### 2. Hardcoded Values vs Semantic Tokens

**Check for:**
- ❌ Hardcoded colors: `bg-blue-500`, `text-gray-700`
- ❌ Magic numbers: `p-4`, `gap-3`, `rounded-lg`
- ❌ One-off styles: `style={{ padding: '12px' }}`
- ✅ Should use: Token-backed Tailwind classes

**Valid tokens:**
```css
/* From packages/design-system/src/styles/tokens.css */
color.background.app
color.background.surface
color.text.primary
color.text.secondary
color.border.default
color.action.primary
color.status.success
```

**Example Finding:**
```
🟢 MINOR: Hardcoded color values

apps/web/src/components/custom-button.tsx:12
<button className="bg-blue-600 text-white">

Recommendation: Use semantic tokens
<button className="bg-action-primary text-on-action-primary">
```

---

### 3. Business Logic in UI Components

**Detect:**
- Data fetching in presentational components
- Business rules in component files
- Prisma types in frontend components
- Backend-specific logic

**Example Finding:**
```
🔴 CRITICAL: Business logic in UI component

apps/web/src/components/interaction-card.tsx:89
Component contains overdue promotion logic

Fix: Move to lib/interaction-status.ts, import as utility
UI components should be pure presentation
```

---

### 4. Component Structure Violations

**Check folder structure:**
```
packages/design-system/src/components/
  button/
    button.tsx          ✅
    button.stories.tsx  ✅
    index.ts           ✅
  
  utils.tsx            ❌ Should be in components/utils/
  MyComponent.tsx      ❌ Should use kebab-case folder
```

**Example Finding:**
```
🟡 MODERATE: Component structure violation

packages/design-system/src/components/StatusBadge.tsx

Fix: Create folder structure:
  components/status-badge/
    status-badge.tsx
    status-badge.stories.tsx
    index.ts
```

---

### 5. Design System Extraction Opportunities

**Evaluate for extraction:**
- ✅ Appears 3+ times
- ✅ Business-agnostic (no Opportunity/Interaction logic)
- ✅ Stable API (not rapidly changing)
- ✅ Reusable across features

**Keep local if:**
- ❌ Single use, unlikely to repeat
- ❌ Tightly coupled to feature
- ❌ Experimental/prototyping
- ❌ Feature-specific customization

**Example Finding:**
```
🟡 MODERATE: Extraction opportunity

Pattern: ParticipantRow (person name + role + avatar)
Occurrences: 4 (interactions drawer, company page, contact list, opportunity detail)
Business logic: None (pure presentation)

Recommendation: Extract to design-system/components/participant-row/
```

---

## Output Format

### Finding Structure

```markdown
[Icon] [SEVERITY]: [Issue Title]

[Description]

Location(s):
- file/path.tsx:line
- file/path2.tsx:line

Recommendation: [Action]

[Optional: Code example]
```

### Severity Levels

🔴 **CRITICAL** - Fix immediately
- Business logic in UI
- Security issues (XSS, injection)
- Type safety violations

🟡 **MODERATE** - Address soon
- 3+ duplicate patterns
- Significant token violations
- Missing Storybook stories

🟢 **MINOR** - Nice to have
- 2 duplicate patterns (watch for 3rd)
- Minor styling inconsistencies
- Missing component docs

---

## Extraction Checklist

When recommending extraction, verify:

### ✅ Extraction Criteria
- [ ] Pattern appears 3+ times (or will soon)
- [ ] No business-specific logic (Opportunity/Interaction/Company)
- [ ] Stable, unlikely to change rapidly
- [ ] Clear prop interface
- [ ] Reusable across different features

### ✅ Design System Structure
- [ ] Component folder uses kebab-case
- [ ] Has component file (.tsx)
- [ ] Has story file (.stories.tsx)
- [ ] Has barrel export (index.ts)
- [ ] Uses semantic tokens (not hardcoded)

### ✅ Migration Plan
- [ ] Create in design-system first
- [ ] Add Storybook story
- [ ] Update one consumer (test)
- [ ] Update remaining consumers
- [ ] Remove duplicates
- [ ] Visual regression test

---

## Common Issues & Fixes

### Issue: Hardcoded Colors

**Bad:**
```tsx
<div className="bg-blue-600 text-white border-gray-300">
```

**Good:**
```tsx
<div className="bg-action-primary text-on-action-primary border-default">
```

---

### Issue: Duplicate Badge Component

**Bad: 3 separate implementations**
```tsx
// File 1
<span className="rounded-full bg-green-100 px-3 py-1 text-green-800">
  {status}
</span>

// File 2
<span className="rounded-full bg-green-100 px-3 py-1 text-green-800">
  {status}
</span>

// File 3
<span className="rounded-full bg-green-100 px-3 py-1 text-green-800">
  {status}
</span>
```

**Good: Single design-system component**
```tsx
// packages/design-system/src/components/badge/badge.tsx
export function Badge({ children, variant = 'default' }: BadgeProps) {
  return (
    <span className={`badge badge-${variant}`}>
      {children}
    </span>
  );
}

// Usage
import { Badge } from '@interviews-tracker/design-system';
<Badge variant="success">{status}</Badge>
```

---

### Issue: Business Logic in Component

**Bad:**
```tsx
// Component file
function InteractionCard({ interaction }: Props) {
  // Overdue promotion logic in component
  const isOverdue = interaction.status === 'SCHEDULED' && 
    new Date(interaction.date) < new Date();
  
  return <div>{isOverdue ? 'NEEDS_FOLLOW_UP' : interaction.status}</div>;
}
```

**Good:**
```tsx
// lib/interaction-status.ts
export function promoteOverdueInteractionStatusForRead(interaction) {
  // Logic here
}

// Component file
import { promoteOverdueInteractionStatusForRead } from '../../lib/interaction-status';

function InteractionCard({ interaction }: Props) {
  const promoted = promoteOverdueInteractionStatusForRead(interaction);
  return <div>{promoted.status}</div>;
}
```

---

## Current Design System Components

**Available primitives:**
```
✅ Button, IconButton
✅ Badge
✅ Card, Modal, Drawer
✅ Input, Textarea, Select, FormField
✅ DataTable
✅ Calendar
✅ LoadingState, Spinner
✅ MaterialIcon
```

**Check before creating new:**
- Does Button/IconButton work?
- Can Badge be styled for your use case?
- Does Card provide the container you need?
- Can FormField wrap your input?

---

## Extraction Candidates

**Patterns seen 3+ times (extract these):**

### 1. StatusBadge
```tsx
// Pattern: Badge with color based on enum
<Badge variant={getVariantForStatus(status)}>{status}</Badge>
```

### 2. TimelineItem
```tsx
// Pattern: Timeline entry with icon, date, content
<div className="timeline-item">
  <Icon />
  <Date />
  <Content />
</div>
```

### 3. DetailRow
```tsx
// Pattern: Label + Value display
<div className="flex justify-between">
  <span className="label">{label}</span>
  <span className="value">{value}</span>
</div>
```

### 4. EmptyState
```tsx
// Pattern: Icon + Message + Action
<div className="empty-state">
  <Icon />
  <p>No items yet</p>
  <Button>Add First Item</Button>
</div>
```

### 5. ParticipantRow
```tsx
// Pattern: Avatar + Name + Role
<div className="flex items-center gap-3">
  <Avatar />
  <div>
    <div className="name">{name}</div>
    <div className="role">{role}</div>
  </div>
</div>
```

---

## Example Session

**User:** "I'm adding a new status indicator to the opportunity list"

**Design System Enforcer Response:**

```markdown
## Design System Check

### ✅ Existing Component Available

The `Badge` component already handles status display:
- Location: packages/design-system/src/components/badge/
- Supports variants: default, success, warning, danger, info
- Uses semantic tokens

Recommendation: Use existing Badge component
```tsx
import { Badge } from '@interviews-tracker/design-system';

<Badge variant={getStatusVariant(status)}>
  {status}
</Badge>
```

### 🟡 Status Variant Mapping

If `getStatusVariant()` doesn't exist, create it in:
`apps/web/src/lib/enum-labels.ts`

### ✅ Token Usage

Ensure variant mapping uses semantic tokens, not hardcoded colors.
```

---

## Integration with Other Skills

**Works with:**
- `architecture-guardian` - This checks UI, that checks logic
- `product-owner` - Validates visual consistency aligns with UX principles
- `system-improvement-reviewer` - Includes this as UI validation step

**Run before:**
- Creating new components
- Copying existing components
- Major UI refactors

**Run after:**
- UI implementation complete
- Before creating PR
- After design changes

---

## Continuous Improvement

**Add pattern detection when:**
- New extraction opportunities emerge
- Design system grows
- New token categories added

**Update recommendations when:**
- Design system conventions change
- New best practices established
- Token system evolves

---

**Last Updated:** 2026-06-18
