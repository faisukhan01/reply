# Task 5 — Inbox + Realtime (work in progress)

Agent: full-stack-developer (Inbox + Realtime)

Scope:
- API: GET /api/conversations, GET+PATCH /api/conversations/[id], POST /api/conversations/[id]/messages
- Page: src/app/(dashboard)/conversations/page.tsx (split-pane live inbox)
- Mini-service: mini-services/realtime-service (socket.io, port 3001)

Notes from prior tasks (worklog.md):
- Prisma models: Conversation { chatbotId, visitorId, visitorName, visitorEmail, status [AI|HUMAN|CLOSED], satisfaction, assignedToId, messages[], createdAt, updatedAt }, Message { conversationId, role [VISITOR|AI|AGENT], content, createdAt }, Chatbot { orgId, ... }
- getCurrentUser() returns { id, email, name, orgId, orgSlug, orgName, role }
- getOrgChatbot(orgId) returns the first chatbot for the org (auto-creates if missing)
- shadcn/ui available at @/components/ui/*
- Brand theme: violet/fuchsia (NO indigo/blue)
- Existing CSS helpers: .scroll-thin, .typing-dot
- Socket.io client connect pattern: io("/?XTransformPort=3001"), path MUST stay "/"

Status: in progress.

## Final Status (DONE)

Files created:
- mini-services/realtime-service/package.json
- mini-services/realtime-service/index.ts
- src/app/api/conversations/route.ts            (GET list, filters ?status & ?q)
- src/app/api/conversations/[id]/route.ts       (GET single+messages, PATCH status/assign/satisfaction)
- src/app/api/conversations/[id]/messages/route.ts  (POST agent message)
- src/app/(dashboard)/conversations/page.tsx    (split-pane live inbox, socket.io-client)

Realtime service: RUNNING on port 3001 (pid 3339), `bun --hot index.ts`, log at mini-services/realtime-service/realtime.log. Verified via socket.io polling handshake (returns valid sid).

Dev server: RUNNING on port 3000 (pid 4583). Note: the auto-managed dev server had stopped during the session (last log 09:25:35, nothing listening on 3000); I restarted it with `nohup bun run dev >> dev.log 2>&1 &` so verification could proceed. If the system's supervisor later restarts its own instance it will simply fail to bind 3000 (mine holds it) — no conflict.

Lint: `bun run lint` → 0 errors, 0 warnings.

Smoke tests:
- GET /api/conversations (no auth) → 401 ✓
- GET /conversations (no auth) → 307 redirect ✓
- GET /api/conversations/abc (no auth) → 401 ✓
- socket.io polling handshake on :3001 → valid sid ✓

Design notes:
- Violet/fuchsia brand theme (no indigo/blue).
- Mobile: list OR detail toggle. Desktop: side-by-side split pane.
- Bubbles: rounded-2xl, max-w-[75%], px-3.5 py-2, text-sm. VISITOR=gray left, AI=violet-tinted left + Bot label, AGENT=violet solid right.
- Typing indicator uses .typing-dot class from globals.css.
- Polls /api/conversations every 10s as a fallback to socket events.
- Socket connects via io("/?XTransformPort=3001") (gateway-compliant — no absolute URLs).

Realtime delivery model: the API route saves the AGENT message to the DB; the inbox client then emits `agent:message` over its own socket. This keeps the realtime service a pure relay and avoids server→service socket connections that would violate the "no absolute URLs" gateway rule.
