/**
 * GET  /api/scheduler
 *   Returns the org's scheduled messages (newest first).
 *
 * POST /api/scheduler
 *   Schedule a new message.
 *   Body: { connectionId, recipientId?, recipientHandle?, content, mediaUrl?, scheduledFor }
 *   - scheduledFor must be an ISO 8601 timestamp in the future.
 *   - connectionId must belong to the caller's org.
 *
 * PATCH /api/scheduler
 *   Update a scheduled message (only if status=PENDING).
 *   Body: { id, content?, scheduledFor?, recipientId?, recipientHandle? }
 *
 * DELETE /api/scheduler?id=...
 *   Cancel a scheduled message (only if status=PENDING).
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export async function GET() {
  let user;
  try {
    user = await getCurrentUser();
  } catch {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const messages = await db.scheduledMessage.findMany({
      where: { orgId: user.orgId },
      orderBy: { scheduledFor: "desc" },
      take: 200,
      select: {
        id: true,
        connectionId: true,
        platform: true,
        recipientId: true,
        recipientHandle: true,
        content: true,
        mediaUrl: true,
        scheduledFor: true,
        status: true,
        attempts: true,
        lastError: true,
        sentAt: true,
        createdAt: true,
        connection: {
          select: { accountName: true, accountHandle: true },
        },
      },
    });
    return NextResponse.json({ messages });
  } catch (err) {
    console.error("[/api/scheduler] DB error:", err);
    return NextResponse.json({ messages: [], dbError: true });
  }
}

export async function POST(req: NextRequest) {
  let user;
  try {
    user = await getCurrentUser();
  } catch {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { connectionId, recipientId, recipientHandle, content, mediaUrl, scheduledFor } = body;
  if (!connectionId || !content || !scheduledFor) {
    return NextResponse.json(
      { error: "connectionId, content, and scheduledFor are required." },
      { status: 400 }
    );
  }
  const when = new Date(scheduledFor);
  if (isNaN(when.getTime())) {
    return NextResponse.json({ error: "scheduledFor must be a valid ISO date." }, { status: 400 });
  }
  if (when.getTime() < Date.now()) {
    return NextResponse.json({ error: "scheduledFor must be in the future." }, { status: 400 });
  }

  try {
    // Verify the connection belongs to the caller's org and is active.
    const connection = await db.platformConnection.findFirst({
      where: { id: connectionId, orgId: user.orgId, status: "ACTIVE" },
    });
    if (!connection) {
      return NextResponse.json(
        { error: "Connection not found or not active. Reconnect the platform first." },
        { status: 404 }
      );
    }

    const msg = await db.scheduledMessage.create({
      data: {
        orgId: user.orgId,
        userId: user.id,
        connectionId,
        platform: connection.platform,
        recipientId: recipientId ?? null,
        recipientHandle: recipientHandle ?? null,
        content,
        mediaUrl: mediaUrl ?? null,
        scheduledFor: when,
        status: "PENDING",
      },
    });
    return NextResponse.json({ ok: true, message: { id: msg.id } });
  } catch (err) {
    console.error("[/api/scheduler POST] DB error:", err);
    return NextResponse.json(
      { error: "DB unavailable — cannot create scheduled message." },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  let user;
  try {
    user = await getCurrentUser();
  } catch {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const { id, content, scheduledFor, recipientId, recipientHandle } = body;
  if (!id) {
    return NextResponse.json({ error: "id is required." }, { status: 400 });
  }

  try {
    // Only PENDING messages can be edited.
    const existing = await db.scheduledMessage.findFirst({
      where: { id, orgId: user.orgId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
    if (existing.status !== "PENDING") {
      return NextResponse.json(
        { error: `Cannot edit a message in status ${existing.status}.` },
        { status: 400 }
      );
    }

    const updates: any = {};
    if (content !== undefined) updates.content = content;
    if (recipientId !== undefined) updates.recipientId = recipientId;
    if (recipientHandle !== undefined) updates.recipientHandle = recipientHandle;
    if (scheduledFor !== undefined) {
      const when = new Date(scheduledFor);
      if (isNaN(when.getTime())) {
        return NextResponse.json({ error: "scheduledFor must be a valid ISO date." }, { status: 400 });
      }
      if (when.getTime() < Date.now()) {
        return NextResponse.json({ error: "scheduledFor must be in the future." }, { status: 400 });
      }
      updates.scheduledFor = when;
    }

    await db.scheduledMessage.update({ where: { id }, data: updates });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[/api/scheduler PATCH] DB error:", err);
    return NextResponse.json({ error: "DB unavailable." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  let user;
  try {
    user = await getCurrentUser();
  } catch {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id is required." }, { status: 400 });
  }

  try {
    // Only PENDING messages can be cancelled. SENT messages stay as audit
    // log; FAILED messages can be cancelled to stop retries.
    const existing = await db.scheduledMessage.findFirst({
      where: { id, orgId: user.orgId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
    if (existing.status === "SENT") {
      return NextResponse.json(
        { error: "Cannot cancel a message that's already been sent." },
        { status: 400 }
      );
    }

    await db.scheduledMessage.update({
      where: { id },
      data: { status: "CANCELLED" },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[/api/scheduler DELETE] DB error:", err);
    return NextResponse.json({ error: "DB unavailable." }, { status: 500 });
  }
}
