# Gmail Interaction Panel

Composable hooks for Gmail integration flow: connect, search, parse, and save interactions from Gmail.

## Architecture

**Main Hook:** `use-gmail-interaction-panel-new.ts`
- Orchestrates the entire Gmail flow
- Composes smaller focused hooks
- Manages queries and side effects

**Sub-Hooks:**

1. **`use-gmail-state.ts`** - Core state management
   - All useState declarations
   - Computed values (isBusy, isReviewingDraft)
   - Returns state values and setters

2. **`use-gmail-connection.ts`** - Connection logic
   - Gmail OAuth connection flow
   - Error handling with reconnect detection
   - API error parsing

3. **`use-gmail-search.ts`** - Search and parse
   - Search Gmail for company emails
   - Parse individual emails
   - Clear/hide emails from results

4. **`use-gmail-save.ts`** - Save operations
   - Create new interaction from email
   - Attach email to existing interaction
   - Query invalidation

## Usage

```tsx
import { useGmailInteractionPanel } from "./use-gmail-interaction-panel-new";

function MyComponent() {
  const panel = useGmailInteractionPanel({
    opportunityId: "abc123",
    companyName: "Acme Corp",
    roleTitle: "Senior Engineer",
    onSaved: (interaction) => console.log("Saved", interaction),
    attachToInteractionId: null // or interaction ID to attach mode
  });

  return (
    <div>
      {!panel.connected && (
        <button onClick={panel.connectGmail}>Connect Gmail</button>
      )}
      {panel.connected && (
        <button onClick={panel.searchEmails}>Search Emails</button>
      )}
    </div>
  );
}
```

## Flow States

- `idle` - Ready to connect or search
- `connecting_gmail` - OAuth flow in progress
- `searching_emails` - Fetching Gmail messages
- `fetching_email` - Loading full email body
- `parsing_email` - Extracting interaction data with AI
- `ready_for_review` - Email parsed, draft ready
- `failed` - Error occurred

## Key Principles

- **Separation of concerns**: Each hook handles one aspect
- **Composability**: Main hook composes sub-hooks
- **Single source of truth**: State lives in use-gmail-state
- **Explicit dependencies**: Handlers passed as props
- **Type safety**: Full TypeScript coverage

## File Size Guidelines

- Each hook file: <200 lines
- Main orchestration: <400 lines
- Total refactored from: 592 lines → ~800 lines (but better organized)
