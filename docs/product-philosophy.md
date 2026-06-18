# Product Philosophy

This document captures the core product decisions and design principles for Interviews Tracker.

---

## Core Mental Model

### Opportunity is the Primary Workspace

Everything centers around winning job opportunities:
- Interactions, notes, tasks, and compensation support the opportunity
- The timeline tells the story of each opportunity's journey
- Company pages aggregate multiple opportunities, but opportunity is primary

**Why:** Job search is opportunity-driven. Users think "I have an interview at Company X for Role Y" not "I have interactions across various companies."

---

### Preparation Over Data Entry

The product optimizes for interview preparation, not record-keeping:
- Surface actionable insights before meetings
- Make it easy to review what matters
- Reduce time spent on data management

**Why:** Users want to win opportunities, not maintain a perfect database. Features should help prepare, not just track.

---

### AI Automation as Default Path

Prefer AI extraction with review over manual data entry:
- **Ideal:** AI extracts → user reviews → user accepts
- **Avoid:** User searches → selects → configures → reviews → confirms
- **Principle:** Confidence-based flows, not binary all-or-nothing

**Why:** Users' time is valuable. AI should do the tedious work; users should focus on high-value decisions.

---

## Established Product Decisions

### Hierarchy

✅ **Opportunity is the main workspace**
- Full detail page with timeline, notes, tasks, compensation
- Most user time spent here
- Primary navigation destination

✅ **Interaction is a supporting entity**
- Always shown in context of opportunity
- Timeline displays interactions chronologically
- No standalone interactions list

✅ **Timeline is source of truth**
- Shows opportunity journey
- Interactions drive status updates
- Clear chronological order

✅ **Company is derived aggregation**
- Aggregates all opportunities for that company
- Useful for research and context
- Not a workspace for managing opportunities

---

### Page Layout

✅ **Interview Preparation before Company Details**
- What helps you win comes first
- Company research supports prep, doesn't dominate
- Users can scroll to company info after prep section

✅ **Company Details supports preparation**
- Tech stack, product, funding visible
- But not the main focus of opportunity page
- Expandable sections for additional context

✅ **Add Interaction is modal-based**
- Focused workflow with clear completion
- Not buried in a drawer
- Modal provides space for form and review

---

### Workflow Principles

✅ **Optimize for preparation, not data management**
- Interview prep features prioritized
- Company research integrated
- Past interactions inform future prep

✅ **AI workflows: automate → review → accept**
- Gmail imports parse automatically
- User reviews pre-filled data
- Single save action

✅ **Manual workflows: simplified input → preview → save**
- Smart defaults provided
- Minimal required fields
- One-screen forms preferred over wizards

✅ **Drawers remain lightweight (view/consume only)**
- Browse past interactions
- Quick reference
- Not for complex editing or creation

---

## Design Inspiration

### Learn From

**Linear**
- Clean, keyboard-first interface
- Fast navigation
- Minimal clicks to complete actions

**Notion Calendar**
- Timeline excellence
- Context preservation
- Smart scheduling

**Superhuman**
- Keyboard shortcuts everywhere
- Speed-optimized workflows
- Opinionated defaults that work

**Raycast**
- Command palette pattern
- Extension model for features
- Quick actions without navigation

**Vercel**
- Deploy UX (one-click with smart defaults)
- Clear feedback on actions
- Progressive disclosure of complexity

---

### Avoid Patterns From

**Salesforce**
- Overwhelming UI with too many visible fields
- Complex navigation requiring training
- Feature bloat

**HubSpot**
- Unclear primary actions
- Over-engineered simple tasks
- Marketing-driven feature proliferation

**Jira**
- Wizard-heavy workflows
- Slow, click-heavy operations
- Over-abstracted concepts

**Legacy CRUD Applications**
- Form-first instead of AI-first
- No intelligent defaults
- Manual data entry for everything
- Database-driven UI (not user-driven)

---

## Workflow Philosophy

### Preparation is More Important Than Data Management

**Good features:**
- Show recent interactions before upcoming interview
- Surface unanswered questions from past discussions
- Link to company research inline
- Highlight topics discussed previously

**Avoid:**
- Detailed analytics dashboards (unless they inform prep)
- Complex tagging/categorization systems
- Features that optimize tracking over winning

---

### AI-First, Not Manual-First

**Preferred:**
```
Import from Gmail
↓
AI parses email/calendar
↓
Pre-filled form shown
↓
User reviews (edits if needed)
↓
Save
```

**Avoid:**
```
User clicks "Add Interaction"
↓
Empty form
↓
User manually enters date
↓
User manually enters type
↓
User manually enters participants
↓
User manually enters notes
↓
Save
```

**When manual is appropriate:**
- AI source unavailable (in-person meeting)
- User prefers to type (quick note)
- Extraction confidence too low

---

### Review, Don't Wizard

**Preferred: Single review screen**
```
[Pre-filled Form]
All fields visible
Edit any field inline
One "Save" button
```

**Avoid: Multi-step wizard**
```
Step 1/4: Choose type
[Next]
Step 2/4: Set date
[Next]
Step 3/4: Add details
[Next]
Step 4/4: Review
[Save]
```

**Why wizards are bad:**
- Force linear flow
- Can't skip ahead
- Can't see all data at once
- More clicks to complete

---

## Navigation & Information Architecture

### Current Structure

**Dashboard**
- Cross-opportunity insights
- Upcoming interactions
- Quick stats

**Opportunities List**
- Filterable by pipeline/status
- Sortable
- Quick actions

**Opportunity Detail (Primary Workspace)**
- Timeline
- Interview Preparation
- Company Details
- Notes
- Tasks
- Compensation

**Company Detail (Aggregation)**
- All opportunities for company
- Company research
- Aggregated interactions

**Interactions**
- No standalone page
- Always shown in opportunity context
- Drawer for quick view

---

## Future Considerations

### When to Challenge These Principles

✅ **Challenge when:**
- User feedback consistently contradicts a principle
- New use case doesn't fit the model
- Data shows users struggling

❌ **Don't challenge just because:**
- One user requests a different pattern
- It's technically easier to build differently
- You saw it work elsewhere (context matters)

### Evolution Process

1. **Observe friction** - Where do users struggle?
2. **Validate with data** - Is it a real pattern or edge case?
3. **Propose alternative** - Document why and what changes
4. **Test hypothesis** - Build minimal version
5. **Document decision** - Update this philosophy

---

**Last Updated:** 2026-06-18

**For implementation patterns, see:** `ux-patterns.md`
**For technical architecture, see:** `architecture.md`
