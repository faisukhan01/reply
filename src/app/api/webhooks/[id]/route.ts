import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

const ALLOWED_EVENTS = new Set([
  "conversation.created",
  "conversation.closed",
  "message.received",
  "satisfaction.rated",
]);

function decodeEvents(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((e) => typeof e === "string");
    }
  } catch {
    // ignore
  }
  return [];
}

function isValidUrl(value: string) {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

async function getOwnedWebhook(id: string, orgId: string) {
  const webhook = await db.webhook.findUnique({ where: { id } });
  if (!webhook || webhook.orgId !== orgId) return null;
  return webhook;
}

// GET /api/webhooks/:id
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const webhook = await getOwnedWebhook(id, user.orgId);
  if (!webhook) {
    return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
  }

  return NextResponse.json({
    webhook: { ...webhook, events: decodeEvents(webhook.events) },
  });
}

// PATCH /api/webhooks/:id — update url, events, active.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await getOwnedWebhook(id, user.orgId);
  if (!existing) {
    return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const data: {
      url?: string;
      events?: string;
      active?: boolean;
    } = {};

    if (typeof body?.url === "string") {
      const url = body.url.trim();
      if (!url) {
        return NextResponse.json(
          { error: "URL cannot be empty" },
          { status: 400 }
        );
      }
      if (!isValidUrl(url)) {
        return NextResponse.json(
          { error: "URL must be a valid http(s) URL" },
          { status: 400 }
        );
      }
      data.url = url;
    }

    if (Array.isArray(body?.events)) {
      const events = Array.from(
        new Set(
          body.events
            .filter((e: unknown): e is string => typeof e === "string")
            .filter((e: string) => ALLOWED_EVENTS.has(e))
        )
      );
      if (events.length === 0) {
        return NextResponse.json(
          { error: "Select at least one valid event" },
          { status: 400 }
        );
      }
      data.events = JSON.stringify(events);
    }

    if (typeof body?.active === "boolean") {
      data.active = body.active;
    }

    const updated = await db.webhook.update({
      where: { id },
      data,
      select: {
        id: true,
        url: true,
        events: true,
        secret: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      webhook: { ...updated, events: decodeEvents(updated.events) },
    });
  } catch (e) {
    console.error("[webhooks PATCH] error", e);
    return NextResponse.json(
      { error: "Failed to update webhook" },
      { status: 500 }
    );
  }
}

// DELETE /api/webhooks/:id
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await getOwnedWebhook(id, user.orgId);
  if (!existing) {
    return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
  }

  await db.webhook.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
