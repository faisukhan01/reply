# Task 5-B: Dashboard & Contacts Polish

## What I did
Polished the Dashboard and Contacts pages per Task 5-B. See `/home/z/my-project/worklog.md` for full work log.

## New files
- `src/components/dashboard/mini-sparkline.tsx` — Pure-SVG sparkline (no recharts).
- `src/components/dashboard/recent-conversations-list.tsx` — Client component with hover tooltips.

## Modified files
- `src/components/dashboard/stat-cards.tsx` — Hover glow, trend sparkline, colored delta pill.
- `src/app/(dashboard)/dashboard/page.tsx` — Banner shimmer + What's new pill + hourly sparkline, top questions %, empty states.
- `src/app/(dashboard)/contacts/page.tsx` — Grid/list toggle, source/sort dropdowns, search clear, contact detail Sheet, edit dialog.
- `src/app/api/contacts/route.ts` — Returns conversationCount + lastSeenAt.
- `src/app/api/contacts/[id]/route.ts` — Added GET (detail + conversations) and PATCH (edit).

## Constraint compliance
- Dashboard is still a Server Component. Icons passed to client components via string keys (iconMap in stat-cards.tsx). No icon-as-prop.
- Contacts page is a Client Component ("use client").
- Used existing shadcn/ui components (Sheet, Select, Tooltip, Dialog, AlertDialog, Table, Avatar, Badge, Skeleton, Card, Button, Input, Label, Textarea).
- Framer-motion used for hover lift, layout animations, AnimatePresence.
- Color palette: violet / emerald / amber / fuchsia / rose / zinc. No indigo or blue.
- `bun run lint` → 0 errors, 0 warnings.
- `bunx tsc --noEmit --skipLibCheck` → no errors in modified/new files.

## Architecture notes for next agent
- The Contact model has no direct relation to Conversation. Linkage is done at query time via `visitorEmail` matching `contact.email`. If you want a more robust link, add a `contactId` foreign key to Conversation.
- The "unread" badge on dashboard recent conversations is a heuristic: number of trailing VISITOR messages since last AI/AGENT reply. Closed conversations are always 0.
- The "online" status dot uses a 5-minute staleness window on the conversation's last message.
- 7-day satisfaction trend is currently a synthetic curve around avgSatisfaction (no per-day satisfaction query was added to avoid extra DB load). Replace with a real query if needed.
