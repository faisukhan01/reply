# Task 4-A: Webhook Persistence

## Summary
Wired up the Webhook Prisma model with real CRUD API routes and replaced the demo/mock Webhooks tab in Settings with live data.

## Files Created
- `src/app/api/webhooks/route.ts` — GET (list org webhooks) + POST (create with auto-secret)
- `src/app/api/webhooks/[id]/route.ts` — GET / PATCH (url, events, active) / DELETE with org-ownership guard
- `src/app/api/webhooks/[id]/test/route.ts` — POST that fires a sample `conversation.created` payload to the webhook URL with HMAC-SHA256 signature header, returns `{ success, status?, error? }`

## Files Modified
- `src/app/(dashboard)/settings/page.tsx`
  - Added `Webhook` type + `WEBHOOK_EVENTS` constant
  - Added state: `webhooks`, `webhooksLoading`, `whDialogOpen`, `creatingWh`, `whForm`, `togglingId`, `deletingId`, `testingId`, `copiedSecret`
  - Added handlers: `fetchWebhooks`, `toggleWhEvent`, `generateWhSecret`, `copyWhSecret`, `handleCreateWebhook`, `handleToggleWebhook` (optimistic), `handleDeleteWebhook`, `handleTestWebhook`
  - Replaced the demo-data Webhooks tab with: controlled create dialog (URL + event checkboxes + secret generator/copier), skeleton loading state, empty state with CTA, live list with per-row Test button / Switch toggle / delete confirm, updated "Test a webhook" reference card showing the actual sample payload and signature header docs.
  - Added `RefreshCw` icon import.

## Key Decisions
- Events stored as JSON-encoded string in `Webhook.events` (per schema). API decodes to arrays for the client; the client never sees the raw JSON string.
- Allowed events are whitelisted server-side: `conversation.created`, `conversation.closed`, `message.received`, `satisfaction.rated`.
- Secret auto-generated as `whsec_` + 20 random bytes (hex) if not provided. Client can also manually generate one in the dialog before submitting.
- Test endpoint signs the body with HMAC-SHA256 using the webhook's secret and sends `X-ReplyAI-Signature: sha256=...` + `X-ReplyAI-Event` headers, with a 10s abort timeout. Non-2xx responses are reported as failures with the status code; network errors return `{ success: false, error }`.
- Toggle uses optimistic UI with rollback on error.

## Verification
- `bun run lint` → 0 errors, 0 warnings ✅
- `bunx tsc --noEmit` → my 3 new API files produce ZERO type errors. The only settings/page.tsx error (`o.users` on OrgInfo at line 205) is pre-existing and was flagged by the Task 6 widget agent in the worklog — not introduced by my changes.

## Notes for Next Agent
- The Webhook model is already in the Prisma schema and the client is generated — no `db:push` needed.
- Webhook firing on real events (e.g., when a conversation is created in `/api/widget`) is NOT yet implemented — only the test endpoint exists. To make webhooks fire on real events, add a helper (e.g., `lib/webhooks.ts` exporting `fireWebhookEvent(orgId, event, data)`) that queries active webhooks for the org subscribed to that event, signs the payload, and POSTs.
