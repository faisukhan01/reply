/**
 * Push Prisma schema to Turso DB.
 *
 * Prisma's `db push` doesn't accept `libsql://` URLs (the sqlite provider
 * requires `file:` URLs). So we generate the DDL via `prisma migrate diff`
 * and apply it directly to Turso using the @libsql/client.
 *
 * Usage:
 *   bun run scripts/push-turso.ts
 *
 * Env vars needed:
 *   DATABASE_URL          - libsql://...  (Turso URL)
 *   DATABASE_AUTH_TOKEN   - Turso auth token
 */

import { createClient } from "@libsql/client";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const url = process.env.DATABASE_URL;
  const token = process.env.DATABASE_AUTH_TOKEN;

  if (!url || !url.startsWith("libsql:")) {
    console.error(
      "ERROR: DATABASE_URL must be a libsql://... URL.\n" +
        "Got: " +
        url
    );
    process.exit(1);
  }
  if (!token) {
    console.error("ERROR: DATABASE_AUTH_TOKEN is not set.");
    process.exit(1);
  }

  console.log("→ Connecting to Turso:", url);

  // Use the deprecated `createClient` from @libsql/client which maps to the
  // classic libSQL client (works fine for DDL execution).
  const client = createClient({ url, authToken: token });

  // Verify connection
  try {
    const res = await client.execute("SELECT 1 AS ok");
    console.log("✓ Connected to Turso. (SELECT 1 →", res.rows?.[0]?.ok, ")");
  } catch (err) {
    console.error("✗ Failed to connect to Turso:", err);
    process.exit(1);
  }

  // Load the SQL DDL
  const sqlPath = path.join("/tmp", "schema_full.sql");
  if (!fs.existsSync(sqlPath)) {
    console.error(
      "ERROR: SQL file not found at " +
        sqlPath +
        "\nRun this first:\n  bunx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > /tmp/schema_full.sql"
    );
    process.exit(1);
  }

  const sql = fs.readFileSync(sqlPath, "utf-8");

  // Strip comment lines first, then split on semicolon followed by newline.
  const stripped = sql
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n");

  const statements = stripped
    .split(/;\s*\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  console.log(`→ Applying ${statements.length} DDL statements to Turso...`);

  let ok = 0;
  let failed = 0;
  const failures: string[] = [];

  for (const stmt of statements) {
    try {
      await client.execute(stmt);
      ok++;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      // "table already exists" / "index already exists" are non-fatal on re-runs
      if (
        msg.includes("already exists") ||
        msg.includes("duplicate column") ||
        msg.includes("no such table")
      ) {
        // ignore idempotent errors
      } else {
        failed++;
        failures.push(`SQL: ${stmt.slice(0, 80)}...\n  ERR: ${msg}`);
      }
    }
  }

  console.log(`\n✓ Done.`);
  console.log(`  Statements applied OK:    ${ok}`);
  console.log(`  Statements failed:        ${failed}`);
  if (failures.length > 0) {
    console.log("\nFailures:");
    for (const f of failures.slice(0, 10)) console.log("  " + f);
  }

  // Verify by listing tables
  try {
    const tables = await client.execute(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
    );
    console.log(
      "\n📋 Tables in Turso DB:",
      tables.rows.map((r: any) => r.name).join(", ")
    );
  } catch (err) {
    console.error("✗ Could not list tables:", err);
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
