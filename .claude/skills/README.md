# Claude Skills for Interviews Tracker

This directory contains specialized skills that help Claude Code maintain consistency, quality, and alignment with product principles.

---

## Available Skills

### 1. **architecture-guardian**
**Purpose:** Validate architectural decisions and detect code quality issues

**When to use:**
- Before implementing new features
- During code review
- When refactoring

**What it checks:**
- Code duplication
- Package boundary violations
- Layering violations (route/controller/service/repository)
- Dead or obsolete code
- Missing abstractions

**Invoke with:** `Skill: architecture-guardian`

---

### 2. **design-system-enforcer**
**Purpose:** Ensure UI consistency and identify reusable patterns

**When to use:**
- When creating or modifying UI components
- Before completing frontend work
- During component extraction discussions

**What it checks:**
- Duplicate UI patterns (3+ uses rule)
- Hardcoded values vs semantic tokens
- Business logic in UI components
- Component structure violations
- Design-system extraction opportunities

**Invoke with:** `Skill: design-system-enforcer`

---

### 3. **product-owner**
**Purpose:** Protect product direction and optimize user experience

**When to use:**
- During feature planning
- When making UX decisions
- When implementing workflows
- Before changing navigation/layout

**What it checks:**
- Opportunity-first hierarchy preserved
- Page/Drawer/Modal usage correctness
- Workflow friction points
- AI-first vs manual-first approach
- Alignment with product principles

**Invoke with:** `Skill: product-owner`

---

### 4. **ai-workflow-optimizer**
**Purpose:** Ensure AI features follow best practices

**When to use:**
- When implementing AI-powered features
- When designing extraction/parsing workflows
- When adding automation

**What it checks:**
- Confidence-based automation implemented
- Review-before-save patterns
- Source traceability
- Partial result handling
- Over-confirmation anti-patterns

**Invoke with:** `Skill: ai-workflow-optimizer`

---

### 5. **system-improvement-reviewer**
**Purpose:** Comprehensive quality check before completing work

**When to use:**
- **Required:** Before completing substantial features
- Before creating pull requests
- After major refactors

**What it checks:**
- Runs all other guardian skills
- Documentation update needs
- Technical debt introduced
- Cleanup opportunities
- Design-system extraction candidates

**Invoke with:** `Skill: system-improvement-reviewer`

---

## Skill Usage Patterns

### Auto-Invoke Recommendations

**Before Implementation:**
```
1. Run architecture-guardian
2. Run product-owner (if UX changes)
3. Plan the approach
4. Implement
```

**Before Commit:**
```
1. Run system-improvement-reviewer
2. Address findings
3. Update documentation if needed
4. Commit
```

**During UI Work:**
```
1. Run design-system-enforcer
2. Check for reusable patterns
3. Use existing components or extract
4. Implement
```

**During AI Features:**
```
1. Run ai-workflow-optimizer
2. Plan confidence-based flows
3. Add source traceability
4. Implement review UI
```

---

## How Skills Work Together

### Example: New Feature Implementation

```
Phase 1: Planning
├─ product-owner → Validate UX approach
└─ architecture-guardian → Check for existing patterns

Phase 2: Implementation
├─ design-system-enforcer → Use existing components
├─ ai-workflow-optimizer → (if AI feature) Design workflow
└─ architecture-guardian → Validate layering

Phase 3: Completion
└─ system-improvement-reviewer → Final quality check
```

### Example: Code Review

```
system-improvement-reviewer
├─ architecture-guardian
│  ├─ Check duplication
│  ├─ Check layering
│  └─ Check dead code
├─ design-system-enforcer
│  ├─ Check UI patterns
│  └─ Check token usage
├─ product-owner
│  ├─ Check UX patterns
│  └─ Check workflow friction
└─ Generate recommendations
```

---

## Skill Invocation Examples

### Direct Invocation
```
Claude, please run the architecture-guardian skill to check for duplication.
```

### Implicit Invocation
```
I'm about to implement a new interaction form. 
→ Claude should automatically consider product-owner and design-system-enforcer
```

### Manual Workflow
```
Before I commit this feature, run a system improvement review.
→ Claude runs system-improvement-reviewer
```

---

## Skill Outputs

Each skill provides:

1. **Findings** - Issues detected with severity levels:
   - 🔴 Critical: Must fix before merging
   - 🟡 Moderate: Should address soon
   - 🟢 Minor: Nice to have

2. **Recommendations** - Specific actions to take:
   - File paths and line numbers
   - Code examples
   - Alternative approaches

3. **Summary** - Overall assessment:
   - What went well
   - What needs attention
   - Suggested next steps

---

## Creating New Skills

If you discover a recurring validation pattern:

1. **Document the pattern** in `.claude/CLAUDE.md`
2. **Create skill file** in this directory
3. **Add to this README** with usage guidance
4. **Test the skill** on real examples
5. **Iterate based on usage**

**Skill file structure:**
```markdown
# Skill Name

## Purpose
[What this skill validates]

## When to Use
[Triggering conditions]

## What It Checks
[Specific validations]

## Output Format
[How findings are reported]

## Examples
[Real usage scenarios]
```

---

## Tips for Using Skills

✅ **Do:**
- Invoke skills early in planning
- Address critical findings immediately
- Use skills for learning (not just validation)
- Suggest skill improvements when you find gaps

❌ **Don't:**
- Skip skills to save time
- Ignore findings without justification
- Create duplicate validations
- Over-rely on skills (still think critically)

---

## Maintenance

**Review schedule:**
- After each major feature: Update examples
- Monthly: Check for stale recommendations
- Quarterly: Evaluate skill effectiveness

**Improvement triggers:**
- Repeated manual corrections
- New patterns emerging
- False positives/negatives
- User friction

---

**Last Updated:** 2026-06-18

**For project context, see:** `../.claude/CLAUDE.md`
