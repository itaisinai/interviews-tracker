# AI Workflow Optimizer Skill

## Purpose

Ensure AI-powered features follow best practices: maximize automation, implement confidence-based flows, ensure source traceability, and handle partial results gracefully.

---

## When to Use

✅ When implementing AI-powered features
✅ When designing extraction/parsing workflows  
✅ When adding automation to manual processes
✅ During review of AI feature implementations

---

## What This Skill Checks

### 1. Confidence-Based Automation

**High Confidence (80%+):** Auto-apply with notification
- Extract → Apply → Show toast → Allow undo

**Medium Confidence (50-80%):** Suggest with easy accept
- Extract → Show review UI → Pre-filled → Accept/Edit

**Low Confidence (<50%):** Provide starting point
- Extract partial → Show form → User completes

**Check for:**
- ❌ Asking user to confirm high-confidence extractions
- ❌ Auto-applying low-confidence data without review
- ✅ Appropriate confidence thresholds

---

### 2. Review-Before-Save Patterns

**Always show:**
- What was extracted/parsed
- Source of data (email, text, etc.)
- Confidence/reasoning when applicable

**User controls:**
- Edit any field before saving
- Reject and try different source
- Save as-is with one click

---

### 3. Source Traceability

**For AI-extracted data:**
- Link to source (`gmailMessageId`, etc.)
- Store extraction metadata
- Allow re-parsing from source
- Show "Imported from..." badges

---

### 4. Partial Result Handling

**✅ Good: Graceful degradation**
- Extract what's available
- Leave other fields blank/default
- User fills gaps manually

**❌ Bad: All-or-nothing**
- Fail entirely if missing fields
- Force user to start over

---

### 5. Over-Confirmation Anti-Patterns

**❌ Don't:**
- "Are you sure?" for every step
- Multiple confirmation modals
- Redundant review steps

**✅ Do:**
- Single review screen
- Clear undo/revert options
- Trust high-confidence data

---

## Common Issues & Fixes

### Issue: Over-Confirming High-Confidence Data

**Bad:**
```
AI extracts with 95% confidence
→ Show "We found this data. Do you want to use it?" modal
→ User clicks "Yes"
→ Show "Are you sure?" modal
→ User clicks "Confirm"
```

**Good:**
```
AI extracts with 95% confidence
→ Auto-fill form
→ Show "Pre-filled from Gmail ✓" indicator
→ User reviews and saves (or edits)
```

---

### Issue: Missing Source Traceability

**Bad:**
```typescript
{
  date: "2026-06-20",
  type: "Interview",
  // No record of where this came from
}
```

**Good:**
```typescript
{
  date: "2026-06-20",
  type: "Interview",
  gmailMessageId: "abc123",
  extractionSource: "calendar",
  extractedAt: "2026-06-18T10:00:00Z"
}
```

---

### Issue: All-or-Nothing Extraction

**Bad:**
```
Email missing participant name
→ Extraction fails entirely
→ User starts from scratch
```

**Good:**
```
Email missing participant name
→ Extract date, type, agenda
→ Show form pre-filled with available data
→ User adds participant name
→ Save
```

---

## Example Session

**User:** "Implementing AI extraction for meeting notes"

**AI Workflow Optimizer Response:**

```markdown
## AI Workflow Check

### ✅ Implement Confidence-Based Flow

Extraction confidence varies by field:
- Date from calendar: High (95%) → Auto-fill
- Participant from email: High (90%) → Auto-fill
- Topics discussed: Medium (60%) → Suggest, allow edit
- Action items: Low (40%) → Show as optional additions

### ✅ Add Source Traceability

Store:
- `gmailMessageId` → Link back to email
- `extractionConfidence` per field
- `extractedAt` timestamp

Show in UI:
- "Imported from Gmail" badge
- "Re-parse" button to try again

### ✅ Handle Partial Results

If extraction is incomplete:
- Don't fail entirely
- Pre-fill available fields
- Mark uncertain fields clearly
- Let user complete missing data

### ⚠️ Avoid Over-Confirmation

Single review screen:
- Show all extracted data
- User edits if needed
- One "Save" button
- No "Are you sure?" prompts
```

---

## Integration with Other Skills

- Works with `product-owner` to validate AI-first approach
- Works with `architecture-guardian` for implementation patterns
- Part of `system-improvement-reviewer` comprehensive check

---

**Last Updated:** 2026-06-18
