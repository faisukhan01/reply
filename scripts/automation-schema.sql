-- ─────────────────────────────────────────────────────────────
-- ReplyAI — Automation engine schema (CREATE TABLE statements)
-- ─────────────────────────────────────────────────────────────
-- Apply this against your Turso production DB when deploying the
-- Phase 3 automation update for the first time.
--
-- To run on Turso (from your local terminal):
--   turso db shell <your-db-name> < scripts/automation-schema.sql
--
-- Or, from Vercel/CI:
--   Set DATABASE_URL and DATABASE_AUTH_TOKEN, then:
--   npx tsx scripts/migrate-turso.ts
--
-- All statements use IF NOT EXISTS so re-running is safe.
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "AutomationRule" (
  id              TEXT PRIMARY KEY NOT NULL,
  orgId           TEXT NOT NULL,
  name            TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'ACTIVE',
  triggerPlatform TEXT NOT NULL,
  triggerEvent    TEXT NOT NULL,
  conditions      TEXT NOT NULL DEFAULT '[]',
  actionType      TEXT NOT NULL,
  actionConfig    TEXT NOT NULL DEFAULT '{}',
  priority        INTEGER NOT NULL DEFAULT 100,
  matchedCount    INTEGER NOT NULL DEFAULT 0,
  lastMatchedAt   DATETIME,
  createdAt       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "AutomationRule_orgId_status_triggerPlatform_triggerEvent_idx"
  ON "AutomationRule"("orgId", "status", "triggerPlatform", "triggerEvent");

CREATE INDEX IF NOT EXISTS "AutomationRule_orgId_status_idx"
  ON "AutomationRule"("orgId", "status");

CREATE TABLE IF NOT EXISTS "AutomationLog" (
  id              TEXT PRIMARY KEY NOT NULL,
  orgId           TEXT NOT NULL,
  ruleId          TEXT NOT NULL,
  triggerPlatform TEXT NOT NULL,
  triggerEvent    TEXT NOT NULL,
  inboundSummary   TEXT NOT NULL,
  actionType      TEXT NOT NULL,
  outcome         TEXT NOT NULL DEFAULT 'PENDING',
  outboundPreview TEXT,
  errorMessage    TEXT,
  latencyMs       INTEGER,
  createdAt       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("ruleId") REFERENCES "AutomationRule"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "AutomationLog_orgId_createdAt_idx"
  ON "AutomationLog"("orgId", "createdAt");

CREATE INDEX IF NOT EXISTS "AutomationLog_ruleId_createdAt_idx"
  ON "AutomationLog"("ruleId", "createdAt");

CREATE INDEX IF NOT EXISTS "AutomationLog_outcome_idx"
  ON "AutomationLog"("outcome");
