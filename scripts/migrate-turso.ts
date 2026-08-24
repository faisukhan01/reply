/**
 * Apply schema changes to Turso production DB.
 *
 * Run with:
 *   DATABASE_URL=libsql://... DATABASE_AUTH_TOKEN=... \
 *     npx tsx scripts/migrate-turso.ts
 *
 * Idempotent — uses CREATE TABLE IF NOT EXISTS.
 */

import { createClient } from "@libsql/client";

async function main() {
  const url = process.env.DATABASE_URL;
  const token = process.env.DATABASE_AUTH_TOKEN;
  if (!url) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }

  const client = createClient({ url, authToken: token });

  console.log("[migrate] connecting to", url.slice(0, 50), "...");

  const stmts = [
    `CREATE TABLE IF NOT EXISTS "AutomationRule" (
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
      "orgId"         TEXT NOT NULL,
      FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE
    )`,
    `CREATE INDEX IF NOT EXISTS "AutomationRule_orgId_status_triggerPlatform_triggerEvent_idx"
       ON "AutomationRule"("orgId", "status", "triggerPlatform", "triggerEvent")`,
    `CREATE INDEX IF NOT EXISTS "AutomationRule_orgId_status_idx"
       ON "AutomationRule"("orgId", "status")`,
    `CREATE TABLE IF NOT EXISTS "AutomationLog" (
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
    )`,
    `CREATE INDEX IF NOT EXISTS "AutomationLog_orgId_createdAt_idx"
       ON "AutomationLog"("orgId", "createdAt")`,
    `CREATE INDEX IF NOT EXISTS "AutomationLog_ruleId_createdAt_idx"
       ON "AutomationLog"("ruleId", "createdAt")`,
    `CREATE INDEX IF NOT EXISTS "AutomationLog_outcome_idx"
       ON "AutomationLog"("outcome")`,
  ];

  // SQLite doesn't like duplicate column definitions — fix the AutomationRule
  // statement by removing the redundant orgId at the end (we keep the FK clause)
  const cleanStmts = [
    `CREATE TABLE IF NOT EXISTS "AutomationRule" (
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
    )`,
    `CREATE INDEX IF NOT EXISTS "AutomationRule_orgId_status_triggerPlatform_triggerEvent_idx"
       ON "AutomationRule"("orgId", "status", "triggerPlatform", "triggerEvent")`,
    `CREATE INDEX IF NOT EXISTS "AutomationRule_orgId_status_idx"
       ON "AutomationRule"("orgId", "status")`,
    `CREATE TABLE IF NOT EXISTS "AutomationLog" (
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
    )`,
    `CREATE INDEX IF NOT EXISTS "AutomationLog_orgId_createdAt_idx"
       ON "AutomationLog"("orgId", "createdAt")`,
    `CREATE INDEX IF NOT EXISTS "AutomationLog_ruleId_createdAt_idx"
       ON "AutomationLog"("ruleId", "createdAt")`,
    `CREATE INDEX IF NOT EXISTS "AutomationLog_outcome_idx"
       ON "AutomationLog"("outcome")`,
  ];

  for (const stmt of cleanStmts) {
    try {
      await client.execute(stmt);
      console.log("[migrate] ok:", stmt.slice(0, 80).replace(/\s+/g, " "), "...");
    } catch (err) {
      console.error("[migrate] FAILED:", err instanceof Error ? err.message : err);
      console.error("  SQL:", stmt);
    }
  }

  // Also add automationRules backref to Organization (relation-only field — no DB column needed)
  // Prisma relations on the parent side don't create columns on the parent table —
  // they're foreign keys on the child side. We already have orgId on AutomationRule.

  console.log("[migrate] done.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
