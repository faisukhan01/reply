/**
 * GET /api/connections
 *   Returns the current org's connected platforms (without tokens).
 *
 * POST /api/connections  (body: { action: "list-status" | "validate-env" })
 *   - list-status: returns each platform's "is this configured on the server"
 *     status (for the connect/disconnect UI)
 *   - validate-env: returns missing env vars per platform (for the docs page)
 *
 * DELETE /api/connections/:id
 *   Disconnects a platform (revokes + deletes the PlatformConnection).
 *   Implemented at /api/connections/[id]/route.ts.
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { listAdapters } from "@/lib/platforms";

export async function GET() {
  let user;
  try {
    user = await getCurrentUser();
  } catch {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const connections = await db.platformConnection.findMany({
      where: { orgId: user.orgId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        platform: true,
        accountId: true,
        accountName: true,
        accountHandle: true,
        status: true,
        scopes: true,
        tokenExpiresAt: true,
        createdAt: true,
      },
    });
    return NextResponse.json({ connections });
  } catch (err) {
    // DB might be unreachable (demo mode) — return empty list so the UI
    // doesn't crash.
    console.error("[/api/connections] DB error:", err);
    return NextResponse.json({ connections: [], dbError: true });
  }
}

export async function POST() {
  let user;
  try {
    user = await getCurrentUser();
  } catch {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  // For each registered platform, return:
  //   - id, name, usesOAuth, required env var names + whether each is set
  // This drives the Connections UI.
  const statuses = listAdapters().map((adapter) => {
    const missing = adapter.validateEnvConfig?.() ?? [];
    return {
      id: adapter.id,
      name: adapter.name,
      usesOAuth: adapter.usesOAuth,
      configured: missing.length === 0,
      missingEnvVars: missing,
    };
  });
  return NextResponse.json({ platforms: statuses });
}
