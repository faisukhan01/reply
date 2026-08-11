import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { randomBytes } from "crypto";

// Allowed webhook events (kept in sync with the settings UI).
const ALLOWED_EVENTS = new Set([
  "conversation.created",
  "conversation.closed",
  "message.received",
  "satisfaction.rated",
]);

function generateSecret() {
  return `whsec_${randomBytes(20).toString("hex")}`;
}

function isValidUrl(value: string) {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

// GET /api/webhooks — list all webhooks for the current user's org.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const webhooks = await db.webhook.findMany({
    where: { orgId: user.orgId },
    orderBy: { createdAt: "desc" },
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

  // Decode JSON-encoded events string into arrays for the client.
  const decoded = webhooks.map((w) => {
    let events: string[] = [];
    try {
      const parsed = JSON.parse(w.events);
      if (Array.isArray(parsed)) {
        events = parsed.filter((e) => typeof e === "string");
      }
    } catch {
      events = [];
    }
    return { ...w, events };
  });

  return NextResponse.json({ webhooks: decoded });
}

// POST /api/webhooks — create a new webhook.
// body: { url, events: string[], secret? }
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const url = typeof body?.url === "string" ? body.url.trim() : "";
    if (!url) {
      return NextResponse.json(
        { error: "URL is required" },
        { status: 400 }
      );
    }
    if (!isValidUrl(url)) {
      return NextResponse.json(
        { error: "URL must be a valid http(s) URL" },
        { status: 400 }
      );
    }

    const rawEvents = Array.isArray(body?.events) ? body.events : [];
    const events = Array.from(
      new Set(
        rawEvents
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

    const secret =
      typeof body?.secret === "string" && body.secret.trim()
        ? body.secret.trim()
        : generateSecret();

    const webhook = await db.webhook.create({
      data: {
        orgId: user.orgId,
        url,
        events: JSON.stringify(events),
        secret,
        active: true,
      },
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

    return NextResponse.json(
      { webhook: { ...webhook, events } },
      { status: 201 }
    );
  } catch (e) {
    console.error("[webhooks POST] error", e);
    return NextResponse.json(
      { error: "Failed to create webhook" },
      { status: 500 }
    );
  }
}
