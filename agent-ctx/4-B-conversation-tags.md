# Task 4-B — Conversation Tags / Labels Feature

## Objective
Add a full conversation tagging system to ReplyAI: org-level tags (with 6 colors), tag CRUD endpoints, per-conversation tag attachment endpoints, and UI for managing tags + attaching them to conversations.

## Files Created
- `src/app/api/tags/route.ts` — GET (list org tags w/ counts) + POST (create, dedup-guarded, default color violet)
- `src/app/api/tags/[id]/route.ts` — PATCH (rename/recolor, org ownership verified) + DELETE (cascade via schema)
- `src/app/api/conversations/[id]/tags/route.ts` — GET (list attached), POST (attach, idempotent via P2002 catch), DELETE (detach, idempotent via P2025 catch)

## Files Modified
- `src/app/api/conversations/[id]/route.ts`
  - GET now `include: { tags: { include: { tag: true } } }` and returns `tags[]` (sorted by name)
  - PATCH response now also includes `tags[]` so the inbox detail doesn't lose tags after a status/assign update
- `src/app/(dashboard)/conversations/page.tsx`
  - Imports: added `Tag as TagIcon`, `Plus`, `Pencil`, `Settings2`, `ChevronsUpDown`, `Hash` from lucide; `toast` from sonner; `Collapsible*`, `Dialog*`, `Label` from shadcn
  - Types: added `TagColor`, `OrgTag`, `ConversationTagInfo`; extended `ConversationDetail` with `tags`
  - Helpers: `tagBadgeClass(color)` + `tagDotClass(color)` mapping the 6 allowed colors (violet, emerald, amber, fuchsia, rose, sky)
  - State: orgTags, tag dialog state (mode/name/color/id), tag delete id, tag toggling id, collapsible panel open
  - Effects: `fetchOrgTags()` on mount
  - Handlers: `saveTag` (create/edit), `deleteTag`, `toggleConversationTag` (optimistic + revert on failure, also bumps org tag counts), `openCreateTagDialog`, `openEditTagDialog`
  - UI: collapsible "Tags" management card above the split pane (lists all org tags as colored chips with counts + edit/delete on hover; empty-state CTA)
  - UI: conversation header now shows the conversation's tags inline next to the status badge, plus an "Add tag" dropdown with checkboxed list of org tags (keeps open via `e.preventDefault()`), plus "Create new tag" and "Manage tags" footer items
  - UI: tag create/edit Dialog with name input, 6-color picker (ring-based), and live preview badge
  - UI: tag delete AlertDialog confirmation

## API Behavior Notes
- All routes use `getCurrentUser()` and return 401 if not authenticated
- Org ownership verified for tag PATCH/DELETE and conversation tag operations (via conversation → chatbot → orgId chain)
- Unique constraints handled gracefully:
  - Tag create: pre-check + `@@unique([orgId, name])` returns 409 on conflict
  - ConversationTag create: catches P2002 (already attached) → 200 with `alreadyAttached: true`
  - ConversationTag delete: catches P2025 (not attached) → 200 with `wasAttached: false`
- Allowed colors enforced server-side via Zod enum

## Verification
- `bun run lint` — clean (no errors, no warnings)
- `bun run db:push` — schema already in sync (Tag + ConversationTag models present)
- Dev server running healthy; no compile/runtime errors in `dev.log`

## Color Choices
Used the 6 allowed colors: violet, emerald, amber, fuchsia, rose, sky. Each maps to a Tailwind class set with light + dark variants. No indigo/blue used (sky is the only blue-family color and is explicitly allowed for tags).

## What Other Agents Should Know
- The conversation PATCH response shape changed: it now includes a `tags` array (id, name, color, assignedAt). If any other agent's code reads the PATCH response, it'll still get all previously-available fields (status, assignedToId, etc.) plus tags.
- The conversation GET response also now includes `tags[]` at the top level of `conversation`.
- Tags are not yet visible in the conversation list item (only in the detail header). A future enhancement could show 1-2 tag chips on list items.
