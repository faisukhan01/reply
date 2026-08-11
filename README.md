# ReplyAI — AI Customer Support Automation Platform

ReplyAI lets businesses upload a knowledge base, embed an AI chatbot on their
website, and let AI answer customer questions 24/7 — with seamless human
takeover when needed.

Built with **Next.js 16**, **TypeScript**, **Tailwind CSS 4**, **shadcn/ui**,
**Prisma**, **NextAuth.js**, **Socket.io**, and the **z-ai-web-dev-sdk**.

---

## ✨ Features

- **Landing page** — animated 3D hero (Three.js), feature grid, pricing,
  testimonials, FAQ accordion, comparison table.
- **Multi-tenant auth** — NextAuth credentials provider, JWT sessions,
  organization-scoped data, role badges (OWNER / ADMIN / AGENT).
- **Dashboard** — welcome banner, KPI stat cards with 7-day sparklines,
  recent conversations, top questions, hourly activity.
- **Conversation inbox** — real-time updates (Socket.io) with 10s polling
  fallback, search, filters (AI / HUMAN / CLOSED / NEEDS_ATTENTION), bulk
  actions, date range picker, conversation tags, AI summary & suggestions,
  typing indicators, read receipts.
- **Chatbot builder** — knowledge base (text / URL), FAQs, persona & tone,
  welcome message, live mini-preview, bulk import, QR code embed, animated
  copy-to-clipboard.
- **Embeddable widget** — `/widget/[botId]` public route, customizable color
  / name / welcome message / persona / position, quick actions, unread
  badge, spring animations.
- **Contacts** — grid / list views, source filter, sort, detail drawer with
  conversation history.
- **Analytics** — 8 KPI cards, 6 charts (Recharts), date range picker,
  CSV & PDF export.
- **Settings** — 7 tabs (Profile, Chatbot, Knowledge, Team, Webhooks, Tags,
  Billing), profile completion progress bar, role management, permissions
  matrix, invite dialog.
- **Realtime** — Socket.io mini-service (port 3001) for live messages &
  conversation updates, with graceful polling fallback.
- **Theming** — light/dark mode (next-themes), purple/magenta brand,
  custom animations (shimmer, float, glow, focus-ring-pulse), custom
  scrollbars.

---

## 🚀 Quick Start (Local)

### Prerequisites

- [Node.js](https://nodejs.org/) 18+ or [Bun](https://bun.sh/) 1.1+
- A SQLite-compatible environment (default) or a Postgres database

### 1. Install dependencies

```bash
bun install
# or
npm install
```

> The `postinstall` script automatically runs `prisma generate`.

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and set:
- `DATABASE_URL` — SQLite path (default `file:../db/custom.db`) **or** a
  Postgres connection string.
- `NEXTAUTH_SECRET` — a strong random secret (generate with
  `openssl rand -base64 32`).
- `NEXTAUTH_URL` — `http://localhost:3000`.

### 3. Set up the database

```bash
bun run db:push    # creates tables from prisma/schema.prisma
bun run seed       # optional: seeds demo org + 28 conversations + contacts
```

### 4. Start the dev server

```bash
bun run dev
```

Open <http://localhost:3000>.

**Demo login:** `demo@replyai.app` / `demo1234`

### 5. (Optional) Start the realtime service

The Socket.io mini-service powers live conversation updates. Without it,
the inbox falls back to 10-second polling.

```bash
cd mini-services/realtime-service
bun install
bun run dev   # starts on port 3001
```

---

## ☁️ Deploying to Vercel

This project is Vercel-ready. Follow these steps:

### 1. Push to GitHub

```bash
git init
git remote add origin https://github.com/<you>/reply.git
git add -A
git commit -m "Initial commit"
git push -u origin main
```

### 2. Import into Vercel

1. Go to <https://vercel.com/new>.
2. Select your GitHub repo.
3. Vercel auto-detects Next.js — **Framework Preset: Next.js**.

### 3. Configure Environment Variables

In the Vercel project settings → **Environment Variables**, add:

| Variable | Value | Notes |
|---|---|---|
| `DATABASE_URL` | `postgresql://...` | **Required for production.** See below. |
| `NEXTAUTH_SECRET` | (random 32+ char string) | Generate with `openssl rand -base64 32` |
| `NEXTAUTH_URL` | `https://your-app.vercel.app` | Your Vercel deployment URL |
| `NEXT_PUBLIC_REALTIME_ENABLED` | `0` | Disable Socket.io (no mini-service on Vercel). The app uses polling fallback. |

### 4. Database — choose one option

#### Option A: PostgreSQL (recommended for production)

Vercel serverless functions have an ephemeral filesystem — **SQLite data
will not persist** between invocations. For production, use Postgres.

1. Provision a Postgres database:
   - [Neon](https://neon.tech/) (free tier, recommended)
   - [Supabase](https://supabase.com/) (free tier)
   - [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres)
2. In `prisma/schema.prisma`, change:
   ```prisma
   datasource db {
     provider = "postgresql"   // was "sqlite"
     url      = env("DATABASE_URL")
   }
   ```
3. Set `DATABASE_URL` to your Postgres connection string in Vercel env vars.
4. Push the schema locally:
   ```bash
   bun run db:push
   ```
5. (Optional) Seed:
   ```bash
   bun run seed
   ```

#### Option B: SQLite (demo only — data is ephemeral)

If you just want to see it run on Vercel without setting up Postgres:

1. Set `DATABASE_URL="file:/tmp/custom.db"` in Vercel env vars.
2. Add a build script override (Vercel → Settings → Build & Development
   Settings → Build Command):
   ```
   prisma db push --accept-data-loss && next build
   ```
3. The database is recreated on each cold start. **Data will be lost.**
   This is fine for a quick demo but not for real use.

### 5. Deploy

Click **Deploy** in Vercel. The build runs:

1. `bun install` → triggers `postinstall` → `prisma generate`
2. `next build`

That's it. Vercel handles the rest.

### 6. Post-deploy

- Visit your deployment URL.
- Log in with the demo credentials (if you seeded) or sign up to create a
  new org.
- The conversation inbox will use polling (10s) since the Socket.io
  mini-service isn't running on Vercel. To enable realtime, deploy the
  mini-service separately (e.g. on Railway, Fly.io, or Render) and set
  `NEXT_PUBLIC_REALTIME_ENABLED=1`.

---

## 📜 Available Scripts

| Script | Description |
|---|---|
| `bun run dev` | Start dev server on port 3000 |
| `bun run build` | Production build (Vercel-compatible) |
| `bun run start` | Start production server |
| `bun run lint` | Run ESLint |
| `bun run db:push` | Push Prisma schema to database |
| `bun run db:generate` | Regenerate Prisma client |
| `bun run db:migrate` | Create a Prisma migration |
| `bun run seed` | Seed demo data |

---

## 🏗️ Project Structure

```
.
├── prisma/
│   └── schema.prisma              # Multi-tenant data model
├── src/
│   ├── app/
│   │   ├── (auth)/                # Public auth pages (login, signup)
│   │   ├── (dashboard)/           # Protected app shell
│   │   │   ├── dashboard/         # KPI dashboard
│   │   │   ├── conversations/     # Inbox (realtime)
│   │   │   ├── chatbot/           # Bot builder (KB, FAQs, embed)
│   │   │   ├── contacts/          # Visitor CRM
│   │   │   ├── analytics/         # Charts + export
│   │   │   ├── settings/          # 7-tab settings
│   │   │   └── widget-demo/       # Widget customization playground
│   │   ├── api/                   # Route handlers (REST)
│   │   │   ├── auth/              # NextAuth
│   │   │   ├── chatbot/           # CRUD + KB + FAQs
│   │   │   ├── conversations/     # List, detail, messages, tags
│   │   │   ├── contacts/          # CRUD
│   │   │   ├── analytics/         # Aggregations
│   │   │   └── widget/            # Public widget endpoints
│   │   ├── widget/[botId]/        # Public embeddable chat widget
│   │   └── page.tsx               # Landing page
│   ├── components/
│   │   ├── ui/                    # shadcn/ui (New York style)
│   │   └── dashboard/             # Sidebar, topbar
│   └── lib/
│       ├── ai.ts                  # z-ai-web-dev-sdk wrapper
│       ├── auth.ts                # NextAuth config
│       ├── db.ts                  # Prisma client singleton
│       ├── realtime.ts            # Socket.io helper (graceful fallback)
│       └── session.ts             # Server-side session helper
├── mini-services/
│   └── realtime-service/          # Socket.io server (port 3001)
├── scripts/
│   └── seed.ts                    # Demo data seeder
├── .env.example                   # Template env file
├── vercel.json                    # Vercel build config
└── next.config.ts                 # Next.js config
```

---

## 🗄️ Data Model

Multi-tenant: each **Organization** owns Users, Chatbots, Contacts,
Conversations, Webhooks, and Tags.

```
Organization ─┬─ User (OWNER/ADMIN/AGENT)
              ├─ Chatbot ─┬─ KnowledgeDoc (text/URL)
              │           ├─ FAQ
              │           └─ Conversation ─┬─ Message (VISITOR/AI/AGENT/SYSTEM)
              │                             └─ Tag[]
              ├─ Contact
              ├─ Webhook
              ├─ Tag
              └─ CannedResponse
```

---

## 🔐 Auth

- **Provider:** NextAuth.js v4 (Credentials, JWT strategy)
- **Multi-tenant:** every User belongs to an Organization; all data is
  org-scoped via `orgId` from the JWT.
- **Middleware:** `src/middleware.ts` protects `/dashboard/*`,
  `/conversations/*`, etc.
- **Roles:** OWNER (full access), ADMIN (invite + manage), AGENT (view &
  respond). Role change API: `PATCH /api/settings/members`.

---

## 🤖 AI

The chatbot uses `z-ai-web-dev-sdk` (server-side only). The system prompt
is built from the chatbot config + knowledge base + FAQs. Personas:
friendly, professional, concise, playful. The AI generates a reply, a
conversation summary, and suggested follow-ups.

---

## ⚡ Realtime

- **Mini-service:** `mini-services/realtime-service/` (Socket.io, Bun, port 3001)
- **Client:** `src/lib/realtime.ts` — singleton socket with graceful fallback.
- **Events:** `message:new`, `conversation:update`, `join:conversation`,
  `leave:conversation`, `agent:message`.
- **Fallback:** if the socket is unavailable (e.g. on Vercel), the inbox
  polls `/api/conversations` every 10 seconds. Set
  `NEXT_PUBLIC_REALTIME_ENABLED=0` to explicitly disable.

---

## 🎨 Theming

- **Brand:** purple / magenta (`violet`, `fuchsia` Tailwind tokens).
- **Dark mode:** via `next-themes` (class strategy).
- **Custom animations:** `shimmer-slow`, `float-subtle`, `border-glow`,
  `focus-ring-pulse` (see `src/app/globals.css`).
- **Scrollbars:** custom-styled, oklch colors, hover expansion.

---

## 📝 License

MIT — built for demonstration. Use it, fork it, ship it.
