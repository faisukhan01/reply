# Task 5-A — Analytics Enhancements

**Agent:** analytics-enhancements
**Task:** Enhance analytics with date range picker, new charts, PDF export, styling polish

## Context reviewed
- Read `/home/z/my-project/worklog.md` — understood project status (ReplyAI Next.js 16 app, analytics page exists with basic charts)
- Read `/home/z/my-project/src/app/(dashboard)/analytics/page.tsx` — existing "use client" page with 14d trend bar chart, satisfaction trend (7d, emerald line), status donut, channel breakdown (bar rows), top questions list, 4 KPI cards
- Read `/home/z/my-project/src/app/api/analytics/route.ts` — server-side aggregations, returns 14d conversationsTrend, 7d satisfactionTrend, statusBreakdown, topQuestions, KPIs
- Verified packages: `recharts ^2.15.4`, `framer-motion ^13.1.0`, `date-fns ^4.1.0`, `react-day-picker ^9.8.0`, `lucide-react ^0.525.0` — all available
- Verified shadcn/ui components present: `chart.tsx`, `popover.tsx`, `calendar.tsx`, `tooltip.tsx`, `badge.tsx`, `card.tsx`, `button.tsx`
- Checked Prisma schema: `Conversation` has `channel` (default "WIDGET"), `status` (AI/HUMAN/CLOSED), `satisfaction Int?`, `createdAt`; `Message` has `role` (VISITOR/AI/AGENT), `createdAt`

## Plan
1. Enhance `/api/analytics/route.ts`:
   - Extend `conversationsTrend` to 90 days
   - Extend `satisfactionTrend` to 14 days
   - Add `hourlyActivity` (24 entries, 0-23, from 90-day window)
   - Add `responseTimeDist` (4 buckets: 1-2, 3-5, 6-10, 10+ msgs)
   - Add `channelBreakdown` { widget, api, other }
   - Add `avgResponseTime` (seconds, from first VISITOR msg → first AI reply)
   - Add `peakHour` (0-23)
   - Add `prev` metrics for trend indicators (7-day-vs-previous-7-day)
2. Rewrite `/src/app/(dashboard)/analytics/page.tsx`:
   - Date range picker (Popover + Calendar) with presets: 7d, 30d, 90d, all
   - Selected range as badge
   - "Last updated" timestamp top right
   - PDF export button (window.print) with tooltip
   - 4 new metric cards (Avg Response Time, Peak Hour, Resolution Rate, Total Messages Sent) with trend indicators
   - Upgrade existing 4 KPI cards with trend indicators + gradient hover
   - Upgrade satisfaction trend → 14d violet line with gradient fill
   - Add response time distribution (horizontal bar, violet/fuchsia)
   - Add hourly activity (bar, emerald, peak highlight)
   - Upgrade channel breakdown → donut chart
   - Staggered fade-in via framer-motion
   - Print-friendly CSS
3. Add print CSS to `globals.css`
4. Lint, fix errors
5. Append to worklog.md
