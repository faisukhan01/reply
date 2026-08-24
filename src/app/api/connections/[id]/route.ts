/**
 * DELETE /api/connections/[id]
 *   Marks the connection as REVOKED and removes stored tokens. The
 *   platform-side OAuth grant is NOT revoked (the user can do that
 *   manually on each platform's settings page) — we just forget it.
 *
 * GET /api/connections/[id]
 *   Returns the connection details (without tokens).
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let user;
  try {
    user = await getCurrentUser();
  } catch {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const conn = await db.platformConnection.findFirst({
      where: { id, orgId: user.orgId },
      select: {
        id: true, platform: true, accountId: true, accountName: true,
        accountHandle: true, status: true, scopes: true,
        tokenExpiresAt: true, createdAt: true,
      },
    });
    if (!conn) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ connection: conn });
  } catch (err) {
    console.error("[/api/connections/[id]] DB error:", err);
    return NextResponse.json({ error: "DB unavailable." }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let user;
  try {
    user = await getCurrentUser();
  } catch {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    // Soft delete — mark as REVOKED and clear tokens. Scheduled messages
    // tied to this connection are NOT deleted (they're audit log); the
    // dispatch loop will skip them because the connection is REVOKED.
    await db.platformConnection.updateMany({
      where: { id, orgId: user.orgId },
      data: {
        status: "REVOKED",
        accessTokenEnc: "",
        refreshTokenEnc: null,
        tokenExpiresAt: null,
      },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[/api/connections/[id]] DB error:", err);
    return NextResponse.json({ error: "DB unavailable." }, { status: 500 });
  }
}
