# Task 4 — Chatbot Builder (work in progress)

Agent: full-stack-developer (Chatbot Builder)

Scope:
- API: GET + PATCH `/api/chatbot`, POST `/api/chatbot/knowledge`, DELETE `/api/chatbot/knowledge/[id]`, POST `/api/chatbot/faqs`, DELETE `/api/chatbot/faqs/[id]`, POST `/api/chatbot/test`
- Page: `src/app/(dashboard)/chatbot/page.tsx` — 4 tabs (Configuration, Knowledge Base, FAQs, Embed)

Notes from prior tasks (worklog.md):
- Prisma models: `Chatbot { orgId, name, welcomeMessage, persona, systemPrompt, primaryColor, status, knowledge[], faqs[] }`, `KnowledgeDoc { chatbotId, title, content, sourceType }`, `FAQ { chatbotId, question, answer }`
- `getCurrentUser()` from `@/lib/session` returns `{ id, email, name, orgId, orgSlug, orgName, role }`
- `getOrgChatbot(orgId)` returns the first chatbot for the org (auto-creates if missing)
- `generateReply(chatbot, history, visitorMessage)` from `@/lib/ai`
- shadcn/ui at `@/components/ui/*`; Sonner toaster already mounted in root layout
- Brand theme: violet/fuchsia (NO indigo/blue)
- Existing CSS helpers: `.scroll-thin`, `.typing-dot`

Status: COMPLETE.

Files delivered:
- `src/app/api/chatbot/route.ts` — GET (auto-create via getOrgChatbot) + PATCH (zod-validated field update).
- `src/app/api/chatbot/knowledge/route.ts` — POST create KnowledgeDoc (TEXT sourceType).
- `src/app/api/chatbot/knowledge/[id]/route.ts` — DELETE (org-scoped ownership check via chatbot.orgId).
- `src/app/api/chatbot/faqs/route.ts` — POST create FAQ.
- `src/app/api/chatbot/faqs/[id]/route.ts` — DELETE (org-scoped ownership check).
- `src/app/api/chatbot/test/route.ts` — POST: loads chatbot (knowledge + faqs), calls `generateReply(chatbot, [], message)`, returns `{ reply }`.
- `src/app/(dashboard)/chatbot/page.tsx` — full client page, 4 tabs.

UX details:
- Configuration tab: name, welcomeMessage (textarea), persona (Select with description), systemPrompt (textarea mono), primaryColor (color input + hex input + 5 preset swatches), status (Switch). Save button disabled when not dirty; shows Loader2 spinner while saving; sonner toast on success/error.
- Live preview widget (sticky on lg): chat header tinted with chosen primaryColor, welcome bubble, sample exchange bubbles, typing-dot indicator while waiting for AI reply, and a "Test your bot" input at the bottom that POSTs to /api/chatbot/test.
- Knowledge tab: stats header (count + total words), "Add document" Dialog (title + content textarea), responsive 2-col card grid, line-clamp-2 content preview, sourceType badge, created date, AlertDialog delete confirm, Loader2 spinner while deleting, nice empty state with CTA.
- FAQ tab: "Add FAQ" Dialog, Accordion list (single-open), AlertDialog delete confirm, empty state with CTA.
- Embed tab: `<pre>` snippet (with actual bot id), Copy button (clipboard API + Check icon swap for 2s), 3-step numbered instructions, "Open live demo" button linking to /widget-demo, plus bot id + status summary card.

Compliance:
- Violet/fuchsia brand only (uses CSS var primary, swatches avoid indigo/blue).
- All cards use `rounded-xl border shadow-sm`.
- Forms stack on mobile (`grid-cols-1`) and go 2-col on `lg` (`lg:grid-cols-[1fr_380px]` and `lg:grid-cols-[1.2fr_1fr]`).
- `bun run lint` passes with zero errors.
- No files outside scope were touched.
