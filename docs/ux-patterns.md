# UX Patterns

Codified UX architecture rules and component usage patterns.

---

## Component Usage Matrix

| Use Case | Component | Why | Example |
|----------|-----------|-----|---------|
| **Browse/Consume** | Drawer | Preserves page context, lightweight | View interaction details from timeline |
| **Create/Workflow** | Modal | Focused task, easily closable | Add new interaction |
| **Main Workspace** | Page | Full functionality, persistent | Opportunity detail page |
| **Quick Action** | Inline/Button | Minimal friction | Mark task complete |

---

## Anti-Patterns

### ❌ Drawers for Creation Workflows

**Why it's bad:**
- Drawers feel cramped for forms
- Users expect drawers for viewing, not creating
- Hard to provide adequate space for all fields

**Do instead:**
- Use modal for focused creation workflow
- Modal can be dismissed easily
- Clear mental model: modal = do something, drawer = view something

---

### ❌ Wizard-Heavy Experiences

**Why it's bad:**
- Forces linear navigation
- Can't see all fields at once
- More clicks to complete
- Harder to go back and edit

**Do instead:**
- Single-screen forms with smart defaults
- Group related fields visually
- Allow non-linear editing
- Show preview inline

---

### ❌ Nested Modals

**Why it's bad:**
- Creates confusion about hierarchy
- Hard to understand how to exit
- Z-index and focus management issues

**Do instead:**
- Use page transitions
- Use tabs within modal
- Collapse/expand sections

---

### ❌ Full CRUD in Drawers

**Why it's bad:**
- Drawers are not mini-pages
- Complex operations need space
- Users lose context with deep nesting

**Do instead:**
- View/consume in drawer
- Edit on page or in modal
- Keep drawers lightweight

---

## Workflow Patterns

### AI-First Automation

```
Parse/Extract → AI Analysis → Show Review UI → User Accepts/Edits → Save
```

**Key principles:**
- Minimize user input
- Provide smart defaults
- Show source of data
- Single review step

**Example: Gmail Import**
```
1. Click "Import from Gmail"
2. System searches by company name
3. Show pre-filled form with extracted data
4. User reviews/edits
5. Click "Save"
```

---

### Manual Fallback

```
Simple Input Form → Preview → Save
```

**Key principles:**
- Smart defaults where possible
- Minimal required fields
- Inline validation
- One-click save

**Example: Manual Interaction**
```
1. Click "Add Interaction"
2. Form with smart defaults (type=Interview, date=today)
3. User enters additional details
4. Click "Save"
```

---

### Bulk Operations

```
Select Multiple → Choose Action → Confirm → Execute
```

**Key principles:**
- Clear selection state
- Visible action options
- Single confirmation
- Clear feedback

**Example: Archive Multiple Opportunities**
```
1. Select checkbox on opportunities
2. "Archive" button appears
3. Click "Archive"
4. Confirm once
5. Toast: "3 opportunities archived"
```

---

## Page Layouts

### Opportunity Detail Layout

**Structure:**
```
[Header: Company + Role + Status]
[Timeline Section - Prominent]
[Interview Preparation Section - Before Details]
[Company Details Section - Collapsible]
[Notes/Tasks/Compensation - Tabs]
```

**Principles:**
- Timeline is prominent (source of truth)
- Prep comes before reference info
- Collapsible sections reduce scroll
- Tabs for secondary content

---

### Dashboard Layout

**Structure:**
```
[Upcoming Interactions Widget]
[Active Opportunities Summary]
[Quick Stats]
```

**Principles:**
- Action-oriented (what's next)
- Cross-opportunity view
- Quick navigation to details

---

### List Pages (Opportunities, Companies)

**Structure:**
```
[Filters + Search]
[Table/Grid View]
[Pagination]
```

**Principles:**
- Scannable at a glance
- Quick actions inline
- Filter without page reload

---

## Navigation Patterns

### Primary Navigation

**Sidebar:**
- Dashboard
- Opportunities (primary)
- Companies (aggregation)
- Interactions (context only)
- Settings

**Principles:**
- Opportunity-first order
- No nesting in sidebar
- Always visible on desktop

---

### Contextual Navigation

**Within Opportunity:**
- Timeline (scrollable, always visible)
- Tabs for related entities
- Drawers for quick view
- Modals for actions

**Principles:**
- Don't leave opportunity context
- Breadcrumbs when needed
- Back button is safe

---

## Form Patterns

### Smart Defaults

**Provide defaults for:**
- Date → Today (or next weekday for interviews)
- Type → Based on previous interaction
- Status → SCHEDULED for future dates
- Source → Pre-fill from context

**Require manual input for:**
- Unique identifiers (company name)
- User-specific data (personal notes)
- High-impact choices (status changes)

---

### Inline Validation

**Show errors:**
- After field loses focus
- Before form submission
- With clear error message
- Next to the field

**Don't show errors:**
- While user is still typing
- For optional fields left blank
- For fields not yet interacted with

---

### Progressive Disclosure

**Hide by default:**
- Advanced options
- Rarely-used fields
- Bulk of company details

**Show by default:**
- Required fields
- Recently-used options
- High-value data for prep

---

## Feedback Patterns

### Success Feedback

**Toast notifications for:**
- Successful saves
- Completed actions
- Background task completion

**Inline feedback for:**
- Form validation success
- Status changes
- Incremental progress

---

### Error Handling

**Show errors:**
- At point of failure
- With clear cause
- With suggested action
- With way to retry

**Example: Gmail Connection Expired**
```
[Warning Banner]
"Your Gmail connection expired. Reconnect to import emails."
[Reconnect Button]
```

---

### Loading States

**Show loading for:**
- Long operations (>500ms)
- Background tasks
- Data fetching

**Provide:**
- Spinner for unknown duration
- Progress bar for known steps
- Optimistic UI when safe

---

## Accessibility Patterns

### Keyboard Navigation

**Support:**
- Tab through interactive elements
- Enter/Space to activate
- Escape to close modals/drawers
- Arrow keys in lists

---

### Screen Readers

**Provide:**
- Semantic HTML (header, nav, main, etc.)
- ARIA labels where needed
- Skip navigation links
- Focus management in modals

---

### Focus Management

**When opening modal:**
1. Trap focus in modal
2. Focus first interactive element
3. Remember previous focus
4. Return focus on close

---

## Mobile Patterns

### Mobile Navigation

**Bottom tab bar for:**
- Primary destinations
- Always accessible
- 3-5 items max

**Hamburger menu for:**
- Secondary options
- Settings
- Less frequent actions

---

### Mobile Forms

**Optimize for:**
- Single column layout
- Large touch targets (44px min)
- Appropriate keyboards (email, tel, number)
- Minimal typing

---

### Mobile Tables

**Transform to:**
- Card layout
- Stacked items
- Swipe actions
- Expandable rows

---

## Animation Patterns

### Use Animation For

**State transitions:**
- Drawer slide in/out
- Modal fade in/out
- Toast appear/dismiss

**Attention:**
- Highlight new items
- Flash on update
- Shake on error

**Continuity:**
- Smooth scrolling
- Layout shifts
- Page transitions

---

### Animation Principles

- **Fast:** 200-300ms for most transitions
- **Smooth:** Ease-out for entering, ease-in for exiting
- **Purposeful:** Animations should communicate, not decorate
- **Respectful:** Honor prefers-reduced-motion

---

## Common Patterns Library

### Status Badge

```tsx
<Badge variant={getStatusVariant(status)}>
  {formatStatusLabel(status)}
</Badge>
```

---

### Timeline Item

```tsx
<TimelineItem
  icon="phone"
  date={interaction.date}
  title={interaction.type}
  description={interaction.notes}
/>
```

---

### Detail Row

```tsx
<DetailRow label="Company" value={opportunity.companyName} />
<DetailRow label="Role" value={opportunity.roleTitle} />
```

---

### Empty State

```tsx
<EmptyState
  icon="inbox"
  title="No interactions yet"
  description="Add your first interaction to get started"
  action={<Button onClick={handleAdd}>Add Interaction</Button>}
/>
```

---

**Last Updated:** 2026-06-18

**For product philosophy, see:** `product-philosophy.md`
