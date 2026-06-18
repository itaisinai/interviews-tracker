---
name: system-improvement-reviewer
description: Use before Before completing substantial features, creating pull requests, after major refactors, or when asked to "review for improvements". Runs all guardian skills and identifies improvement opportunities.
---

# System Improvement Reviewer Skill

## Purpose

Comprehensive quality check before completing substantial work. Orchestrates all other guardian skills and identifies improvement opportunities.

---

## When to Use

✅ **Required: Before completing substantial features**
✅ Before creating pull requests
✅ After major refactors
✅ When asked to "review for improvements"

---

## What This Skill Does

### Runs All Guardian Skills

1. **architecture-guardian**
   - Code duplication
   - Layering violations
   - Package boundaries
   - Dead code

2. **design-system-enforcer**
   - UI pattern duplication
   - Token usage
   - Extraction opportunities

3. **product-owner**
   - UX pattern validation
   - Workflow friction
   - Product alignment

4. **ai-workflow-optimizer** (if applicable)
   - Confidence-based flows
   - Source traceability
   - Over-confirmation

---

### Additional Checks

**Documentation:**

- [ ] README.md updates needed?
- [ ] CLAUDE.md updates needed?
- [ ] New patterns to document?
- [ ] Engineering decisions to record?

**Technical Debt:**

- [ ] TODOs added (with context)?
- [ ] Temporary hacks flagged?
- [ ] Known limitations documented?

**Testing:**

- [ ] New code paths tested?
- [ ] Edge cases handled?
- [ ] Error scenarios considered?

**Cleanup Opportunities:**

- [ ] Unused imports to remove?
- [ ] Console.log statements to remove?
- [ ] Commented code to delete?

---

## Required Final Check: Local Verification

Before completing substantial work, ask:

Did this change affect UI, routing, flows, API contracts, or user-facing behavior?

If yes:

- Was the relevant page opened locally?
- Was a representative user flow exercised?
- Were console errors checked?
- Were server logs checked?
- Was the result documented?

If not completed, mark the task as incomplete or explicitly report the verification gap.

---

## Output Format

### Comprehensive Report

```markdown
# System Improvement Review

## 🏗️ Architecture

[Results from architecture-guardian]

## 🎨 Design System

[Results from design-system-enforcer]

## 📦 Product Direction

[Results from product-owner]

## 🤖 AI Workflows

[Results from ai-workflow-optimizer if applicable]

## 📚 Documentation

- [ ] Update needed: [file]
- [ ] New pattern to document: [description]

## 🧹 Cleanup Opportunities

- [ ] Remove: [file:line]
- [ ] Extract: [pattern]
- [ ] Consolidate: [files]

## ✅ Summary

[Overall assessment]

## 🎯 Recommended Next Steps

1. [Critical fixes]
2. [Moderate improvements]
3. [Nice-to-haves]
```

---

## Usage Example

**User:** "Please review this feature for improvements before I merge"

**System Improvement Reviewer:**

```markdown
# System Improvement Review

## 🏗️ Architecture

✅ Layering correct: Route → Controller → Service → Repository
✅ No package boundary violations
🟡 Minor duplication: Date formatting appears 3x

## 🎨 Design System

🟡 Extraction opportunity: TimelineItem pattern (4 occurrences)
✅ Semantic tokens used throughout
✅ No hardcoded styles

## 📦 Product Direction

✅ Drawer used correctly (view-only)
✅ Workflow has 2 steps (efficient)
✅ Aligns with Opportunity-first principle

## 🤖 AI Workflows

N/A (not an AI feature)

## 📚 Documentation

- [ ] Update docs/ux-patterns.md with new Timeline pattern
- [ ] No CLAUDE.md updates needed

## 🧹 Cleanup Opportunities

- [ ] Remove unused import in opportunity-page.tsx:5
- [ ] Extract TimelineItem to design-system
- [ ] Consolidate date formatting utilities

## ✅ Summary

Feature is production-ready. One moderate improvement suggested:
Extract TimelineItem pattern (appears 4x).

## 🎯 Recommended Next Steps

1. Consider extracting TimelineItem before merge (30 min)
2. Update docs/ux-patterns.md (5 min)
3. Schedule date formatting consolidation for next sprint
```

---

## Integration Pattern

This skill is the **final gate** before completion:

```
Feature Implementation
↓
system-improvement-reviewer
↓
Address Critical Findings
↓
Document Changes
↓
Commit & PR
```

---

**Last Updated:** 2026-06-18
