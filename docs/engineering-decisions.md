# Engineering Decisions

This document records significant architectural and technical decisions made for this project, in ADR (Architecture Decision Record) format.

---

## Decision: Adopt Nx Monorepo Orchestration

**Date:** 2026-05-15  
**Status:** Accepted

### Context
Needed build orchestration for multiple packages with dependency relationships. Yarn workspaces handle installation but not build ordering.

### Decision
Use Nx for task orchestration, dependency ordering, and build caching alongside Yarn 4 workspaces.

### Consequences
- **Positive:** Automatic dependency-based build ordering
- **Positive:** Build caching speeds up repeated builds
- **Positive:** Consistent task interface (`nx build`, `nx typecheck`)
- **Negative:** Additional tool to learn
- **Negative:** `project.json` files to maintain

### Alternatives Considered
- Turborepo: Similar capabilities, chose Nx for broader ecosystem
- Manual scripts: Too error-prone as packages grew

---

## Decision: Extract Design System to Package

**Date:** 2026-06-05  
**Status:** Accepted

### Context
UI components were duplicated across pages. Needed reusable primitives independent of business logic.

### Decision
Create `@interviews-tracker/design-system` package with business-agnostic components using semantic tokens.

### Consequences
- **Positive:** Eliminated duplicate button/badge/card implementations
- **Positive:** Consistent visual language
- **Positive:** Storybook for component documentation
- **Negative:** Extra boundary to cross for simple UI changes
- **Negative:** Requires discipline to keep business logic out

### Alternatives Considered
- Inline components: Led to duplication and inconsistency
- External UI library (shadcn, etc.): Wanted full control over design system

---

## Decision: Route/Controller/Service/Repository Layering

**Date:** 2026-05-20  
**Status:** Accepted

### Context
Route files were becoming monolithic with mixed concerns (HTTP, business logic, Prisma queries).

### Decision
Enforce layering: Route → Controller → Service → Repository → Prisma

### Consequences
- **Positive:** Clear separation of concerns
- **Positive:** Business logic reusable outside HTTP context
- **Positive:** Easier to test (mock at service boundary)
- **Negative:** More files for simple operations
- **Negative:** Some boilerplate for CRUD operations

### Alternatives Considered
- Keep all in routes: Quick initially, but doesn't scale
- Repository-only: Missing orchestration layer for multi-repository operations

---

## Decision: ownerEmail Data Isolation Pattern

**Date:** 2026-06-17  
**Status:** Accepted

### Context
Multi-user support needed. All data must be scoped to authenticated user. Dev mode needed for local testing.

### Decision
Add `ownerEmail` field to all core tables. Filter all queries by `ownerEmail`. Support dev mode authentication bypass with separate test user.

### Consequences
- **Positive:** Clear data isolation per user
- **Positive:** No risk of data leakage between users
- **Positive:** Dev mode enables Auth0-free local development
- **Negative:** ownerEmail in every query (handled by repository layer)
- **Negative:** Migration required to backfill existing data

### Alternatives Considered
- Row-level security: More complex, harder to debug
- Separate schemas per user: Operationally complex
- No isolation: Security risk

---

## Decision: Dev Mode Authentication Bypass

**Date:** 2026-06-17  
**Status:** Accepted

### Context
Local development required Auth0 setup, slowing down AI assistants and new developers.

### Decision
Implement dev mode bypass with test user (`dev@local.test`) and multiple safety checks (local DB only, not production, prominent warnings).

### Consequences
- **Positive:** Fast local development without Auth0
- **Positive:** AI assistants can test features
- **Positive:** Isolated test data
- **Negative:** Must never accidentally enable in production
- **Negative:** Separate data set to maintain

### Alternatives Considered
- Mock Auth0: Complex to maintain
- Required Auth0 setup: Too much friction for local dev
- Anonymous mode: Doesn't test auth flows properly

---

## Decision: Gmail Interaction Import with Separate OAuth

**Date:** 2026-06-10  
**Status:** Accepted

### Context
Users wanted to import interactions from Gmail calendar invites and emails. Auth0 tokens don't grant Gmail access.

### Decision
Separate Google OAuth flow for read-only Gmail access. Store encrypted refresh tokens. AI parses calendar invites and email content.

### Consequences
- **Positive:** Automatic interaction data extraction
- **Positive:** Source traceability via `gmailMessageId`
- **Positive:** Separate consent scope (read-only Gmail)
- **Negative:** Extra OAuth flow to maintain
- **Negative:** Token encryption/refresh complexity
- **Negative:** Gmail API quota management

### Alternatives Considered
- Use Auth0 tokens: Would need broader scope, mixing concerns
- Manual entry only: Too much user friction
- IMAP integration: Less structured data, harder to parse

---

## Decision: Opportunity-First Data Model

**Date:** 2026-05-01  
**Status:** Accepted

### Context
Needed to decide primary entity: Company, Opportunity, or Interaction.

### Decision
Opportunity (`JobOpportunity`) is the primary workspace. Interactions, Notes, Tasks support opportunities. Company is derived aggregation.

### Consequences
- **Positive:** Aligns with user mental model (job search is opportunity-driven)
- **Positive:** Clear hierarchy and relationships
- **Positive:** Opportunity detail page is full workspace
- **Negative:** Company features are secondary
- **Negative:** No standalone interactions list

### Alternatives Considered
- Company-first: Doesn't match user flow (apply to opportunities, not companies)
- Interaction-first: Loses context of which opportunity
- Flat model: Harder to maintain relationships

---

## Decision: AI-First Workflow Pattern

**Date:** 2026-06-01  
**Status:** Accepted

### Context
Users spend too much time on manual data entry. AI can extract most data from emails and job descriptions.

### Decision
Default to AI extraction with review, not manual entry. Implement confidence-based automation (high confidence = auto-fill, low confidence = suggest).

### Consequences
- **Positive:** Dramatically reduced user input required
- **Positive:** Faster workflow (2 clicks vs 10+ fields)
- **Positive:** Source traceability (link to email)
- **Negative:** AI costs (OpenAI API)
- **Negative:** Extraction errors need manual correction
- **Negative:** Requires "review before save" UI pattern

### Alternatives Considered
- Manual entry only: Too much friction
- Auto-save without review: Users don't trust it
- Optional AI assist: Users default to manual, defeating purpose

---

## Decision: Semantic Tokens in Design System

**Date:** 2026-06-05  
**Status:** Accepted

### Context
Hardcoded Tailwind colors (`bg-blue-500`) made theme changes difficult and caused inconsistency.

### Decision
Define semantic tokens (`color.action.primary`, `color.text.secondary`) in CSS, map to Tailwind classes. Require design-system components to use tokens.

### Consequences
- **Positive:** Theme changes update entire app
- **Positive:** Consistent color usage
- **Positive:** Semantic meaning clear from class name
- **Negative:** Extra indirection layer
- **Negative:** Requires discipline to use tokens vs hardcoded values

### Alternatives Considered
- Tailwind theme customization only: Less semantic meaning
- CSS-in-JS: Wanted to stay in Tailwind ecosystem
- No abstraction: Led to inconsistent usage

---

## Decision: Modal for Creation, Drawer for Viewing

**Date:** 2026-06-08  
**Status:** Accepted

### Context
Needed UX pattern for when to use drawers vs modals.

### Decision
- **Modals:** Creation workflows, focused tasks
- **Drawers:** Viewing content, quick reference
- **Pages:** Main workspaces, complex operations

### Consequences
- **Positive:** Clear mental model for users
- **Positive:** Modals provide space for forms
- **Positive:** Drawers preserve page context
- **Negative:** Can't use drawer for creation (consistency rule)

### Alternatives Considered
- Drawers for everything: Felt cramped for creation
- Modals for everything: Lost quick-view benefits
- No pattern: Inconsistent UX

---

## Decision: Framer Motion for Sidebar Animation

**Date:** 2026-06-18  
**Status:** Accepted

### Context
Collapsible sidebar needed smooth text fade/reveal animations. CSS-only approach caused layout issues during transitions.

### Decision
Use Framer Motion for text animations in sidebar collapse/expand. Single `transitionDuration` constant for consistency.

### Consequences
- **Positive:** Smooth text fade without layout shift
- **Positive:** Proper exit animations with `AnimatePresence`
- **Positive:** Easy to adjust timing globally
- **Negative:** Added dependency (~50KB)
- **Negative:** Slightly more complex than CSS-only

### Alternatives Considered
- CSS transitions only: Text took space even when `opacity: 0`
- Conditional rendering: No smooth fade effect
- React Spring: More powerful but overkill for simple fades

---

## Template for New Decisions

```markdown
## Decision: [Title]

**Date:** YYYY-MM-DD  
**Status:** Accepted | Superseded | Deprecated

### Context
[Why this decision was needed. What problem were we solving?]

### Decision
[What was decided. Be specific about the approach taken.]

### Consequences
- **Positive:** [Benefits]
- **Negative:** [Trade-offs, limitations]

### Alternatives Considered
- [Alternative 1]: [Why not chosen]
- [Alternative 2]: [Why not chosen]
```

---

**Last Updated:** 2026-06-18

**To add a decision:** Use the template above and append to this file.
