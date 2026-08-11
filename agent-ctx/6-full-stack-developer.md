# Task 6 — full-stack-developer (Widget)

**Scope:** Build embeddable chat widget + widget demo page + public `/api/widget` route for ReplyAI.

## Files Created

1. **`src/app/api/widget/route.ts`** — Public, no-auth API.
   - `GET ?botId=...` → returns `{ id, name, welcomeMessage, primaryColor, status, position }`. Returns `{ status: "PAUSED" }` for paused bots. 404 for unknown bots.
   - `POST { botId, visitorId, message, visitorName?, visitorEmail? }` → finds-or-creates Conversation (status "AI", channel "WIDGET"), persists VISITOR message, loads last 10 messages, calls `generateReply(chatbot, history, message)` from `@/lib/ai`, persists AI reply, bumps `conversation.updatedAt`. Returns `{ reply, conversationId }`. All error paths return 200 with a fallback reply string.
   - Backfills visitor name/email on the conversation when previously missing.

2. **`src/app/widget/[botId]/page.tsx`** — `"use client"`, PUBLIC (no auth, outside `(dashboard)` group, not in middleware matcher).
   - Reads botId via `useParams<{ botId: string }>()`.
   - Generates/loads a stable `visitorId` from `localStorage["replyai_visitor_id"]` (random fallback if localStorage unavailable).
   - Fetches GET `/api/widget?botId=...` for bot config.
   - Renders loading / paused / not-found / minimized / active states.
   - Active chat: full-height (`h-screen`) layout, mobile-friendly, sm:rounded-2xl + shadow-2xl on larger screens.
   - Header: gradient avatar with Bot icon, bot name, green-ping "Online" status, Minimize button.
   - Messages: visitor bubbles right (primaryColor), AI bubbles left (`bg-muted`). Welcome message seeded as first AI bubble.
   - Typing indicator: 3 bouncing `.typing-dot` spans (CSS already in globals.css).
   - Composer: rounded input + circular Send button (primaryColor). Enter to send. Auto-focus + auto-scroll.
   - Dynamic primaryColor via CSS variable `--bot-color` on root container, consumed via `bg-[var(--bot-color)]` and inline `style.backgroundColor`.
   - "Powered by ReplyAI" gradient-text footer link.

3. **`src/app/(dashboard)/widget-demo/page.tsx`** — `"use client"`, authenticated via dashboard layout.
   - Fetches GET `/api/chatbot` client-side; handles 3 response shapes defensively (`data.id`, `data.chatbot.id`, array).
   - Two-column responsive grid:
     - LEFT: Embed-code Card (gradient header, `<pre>` snippet + Copy button with Check feedback) + How-it-works Card (3 numbered steps: Code2 / Palette / MessageSquare).
     - RIGHT (sticky): Live-preview Card with phone-mockup iframe (`w-[380px] h-[560px] rounded-[2rem] border-8 border-gray-800`) loading `/widget/{botId}`. Reload button.
   - Customization Card: 6 color swatches (violet, fuchsia, rose, emerald, amber, teal — NO indigo/blue) with Tooltip + active Check; position picker (bottom-right/bottom-left) as mini-screen mockups. Visual-only state.
   - Three value-prop Cards at bottom (AI-powered / Real-time / 1-line install) with gradient icons.
   - shadcn components used: Card, Button, Badge, Separator, Tooltip (in TooltipProvider).
   - Violet/fuchsia brand theme throughout (NO indigo/blue).

## Verification

- `bun run lint` → **clean** (0 errors, 0 warnings).
- `bunx tsc --noEmit` → my three files produce **no type errors** (other agents' files have unrelated errors in settings page and chatbot/faqs API — outside my scope).

## Architecture Notes for Downstream Agents

- The widget posts messages to `/api/widget` which creates/updates `Conversation` and `Message` rows in the same Prisma tables. The inbox page (Task 2/3) should read these conversations; the `status` field starts as `"AI"` and should flip to `"HUMAN"` when a human agent takes over.
- `Conversation.channel` is set to `"WIDGET"` for messages arriving through this path — useful for analytics filtering.
- `visitorId` is generated client-side and stored in localStorage. For the same visitor on the same browser, all conversations attach to the same `visitorId`. If you want cross-device continuity, you'd need to add an auth/identification step (out of scope here).
- The widget uses CSS variable `--bot-color` so the entire UI re-themes from a single value. If the chatbot builder (another task) updates `primaryColor`, the widget re-fetches config on page load and instantly reflects the new color.
- The demo page iframe uses same-origin relative path `/widget/${bot.id}` — no port needed, works through the Caddy gateway transparently.

## Issues / Dependencies

- Depends on `/api/chatbot` (owned by another agent) returning the chatbot object. I handle `data.id`, `data.chatbot.id`, and array shapes defensively, so any of those will work.
- No other issues to escalate.
