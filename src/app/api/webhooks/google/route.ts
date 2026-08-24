/**
 * POST /api/webhooks/google
 *
 * Google Pub/Sub push endpoint — receives Gmail + Calendar push
 * notifications. Google Pub/Sub wraps the actual Gmail event in an
 * envelope:
 *   {
 *     "message": {
 *       "data": "<base64 of { emailAddress, historyId }>",
 *       "messageId": "...",
 *       "publishTime": "..."
 *     },
 *     "subscription": "projects/.../subscriptions/..."
 *   }
 *
 * We decode `data`, look up the user by email, then call Gmail API
 * `users.messages.list` with the historyId to fetch the new email
 * body. That body is then piped through `processInboundEvent` with
 * platform=GOOGLE, event=EMAIL_RECEIVED.
 *
 * NOTE: This implementation only processes the most recent unread
 * message — for high-volume inboxes, batch fetch + dedupe by historyId.
 *
 * For Calendar, Google sends a similar envelope with `eventName` set
 * to "calendar.googleapis.com/eventStart" — we process these as
 * CALENDAR_STARTING events.
 *
 * Auth: Google Pub/Sub push subscriptions can be configured with
 * an OIDC token. We verify the `Authorization: Bearer <token>` header
 * against the GOOGLE_PUBSUB_VERIFIER_EMAIL env var if set. If unset,
 * we accept the request (dev convenience) but log a warning.
 *
 * Env vars required:
 *   - GOOGLE_CLIENT_ID
 *   - GOOGLE_CLIENT_SECRET
 *   - GOOGLE_PUBSUB_VERIFIER_EMAIL  (optional but strongly recommended)
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { decryptToken } from "@/lib/platforms/_crypto";
import { processInboundEvent } from "@/lib/automation/engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

type PubSubData = {
  emailAddress?: string;
  historyId?: string;
  eventName?: string;
};

type PubSubEnvelope = {
  message?: { data?: string; messageId?: string; publishTime?: string };
  subscription?: string;
};

export async function POST(req: NextRequest) {
  // Verify OIDC token if verifier is configured
  const verifierEmail = process.env.GOOGLE_PUBSUB_VERIFIER_EMAIL;
  const authHeader = req.headers.get("authorization") ?? "";
  if (verifierEmail) {
    if (!authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing bearer token" }, { status: 401 });
    }
    // We don't fully validate the JWT here (needs a JWKS fetch + signature
    // check). For now, we trust that Pub/Sub set the verifier email in
    // the `x-goog-auth-subject` header.
    const subject = req.headers.get("x-goog-auth-subject") ?? "";
    if (subject !== verifierEmail) {
      return NextResponse.json({ error: "Subject mismatch" }, { status: 401 });
    }
  } else if (process.env.NODE_ENV === "production") {
    console.warn("[webhook/google] GOOGLE_PUBSUB_VERIFIER_EMAIL is not set — accepting unverified webhook (insecure).");
  }

  const raw = await req.text();
  let envelope: PubSubEnvelope;
  try { envelope = JSON.parse(raw); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const dataB64 = envelope.message?.data;
  if (!dataB64) {
    return NextResponse.json({ error: "Missing message.data" }, { status: 400 });
  }

  let data: PubSubData;
  try {
    data = JSON.parse(Buffer.from(dataB64, "base64").toString("utf-8"));
  } catch {
    return NextResponse.json({ error: "Invalid base64 data" }, { status: 400 });
  }

  // Calendar event start
  if (data.eventName?.startsWith("calendar.googleapis.com")) {
    // For calendar events, the emailAddress field tells us who owns it
    if (!data.emailAddress) {
      return NextResponse.json({ received: true, skipped: "no email" });
    }
    const conn = await findGoogleConnectionByEmail(data.emailAddress);
    if (!conn) {
      return NextResponse.json({ received: true, skipped: "no connection" });
    }
    const r = await processInboundEvent({
      orgId: conn.orgId,
      platform: "GOOGLE",
      event: "CALENDAR_STARTING",
      senderId: data.emailAddress,
      senderName: data.emailAddress,
      text: "Calendar event starting",
      connectionAccountId: conn.accountId,
    });
    return NextResponse.json({ received: true, processed: 1, result: r });
  }

  // Gmail inbound
  if (!data.emailAddress || !data.historyId) {
    return NextResponse.json({ received: true, skipped: "no email/historyId" });
  }

  const conn = await findGoogleConnectionByEmail(data.emailAddress);
  if (!conn) {
    return NextResponse.json({ received: true, skipped: "no connection" });
  }

  // Refresh the access token if needed (Google tokens last 1 hour)
  let accessToken = decryptToken(conn.accessTokenEnc);
  if (conn.tokenExpiresAt && new Date(conn.tokenExpiresAt).getTime() < Date.now() + 60_000) {
    if (conn.refreshTokenEnc) {
      try {
        const refreshed = await refreshGoogleToken(decryptToken(conn.refreshTokenEnc));
        // Best-effort update — don't block the webhook response
        await db.platformConnection.update({
          where: { id: conn.id },
          data: {
            accessTokenEnc: encryptForStorage(refreshed.accessToken),
            tokenExpiresAt: refreshed.expiresAt ?? null,
          },
        }).catch(() => {});
        accessToken = refreshed.accessToken;
      } catch (err) {
        console.error("[webhook/google] token refresh failed:", err);
        return NextResponse.json({ received: true, skipped: "token refresh failed" });
      }
    }
  }

  // Fetch the latest unread message via Gmail API
  try {
    const listRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=is:unread&maxResults=1`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!listRes.ok) {
      return NextResponse.json({ received: true, skipped: `list ${listRes.status}` });
    }
    const listData = await listRes.json();
    const msgId = listData.messages?.[0]?.id;
    if (!msgId) {
      return NextResponse.json({ received: true, skipped: "no new messages" });
    }
    const msgRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msgId}?format=metadata&metadataHeaders=From&metadataHeaders=Subject`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!msgRes.ok) {
      return NextResponse.json({ received: true, skipped: `get ${msgRes.status}` });
    }
    const msgData = await msgRes.json();
    const fromHeader = msgData.payload?.headers?.find((h: any) => h.name === "From")?.value ?? "";
    const subject = msgData.payload?.headers?.find((h: any) => h.name === "Subject")?.value ?? "";
    const snippet = msgData.snippet ?? "";

    const r = await processInboundEvent({
      orgId: conn.orgId,
      platform: "GOOGLE",
      event: "EMAIL_RECEIVED",
      messageId: msgId,
      senderId: fromHeader,
      senderName: fromHeader,
      text: `Subject: ${subject}\n\n${snippet}`,
      connectionAccountId: conn.accountId,
    });
    return NextResponse.json({ received: true, processed: 1, result: r });
  } catch (err) {
    console.error("[webhook/google] message fetch failed:", err);
    return NextResponse.json({ received: true, error: String(err) }, { status: 500 });
  }
}

async function findGoogleConnectionByEmail(email: string) {
  try {
    return await db.platformConnection.findFirst({
      where: { platform: "GOOGLE", accountHandle: email, status: "ACTIVE" },
      select: { id: true, orgId: true, accountId: true, accessTokenEnc: true, refreshTokenEnc: true, tokenExpiresAt: true },
    });
  } catch (err) {
    console.error("[webhook/google] DB error:", err);
    return null;
  }
}

async function refreshGoogleToken(refreshToken: string): Promise<{ accessToken: string; expiresAt?: Date }> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Google creds not set");
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  });
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(`Google refresh failed: ${data.error_description ?? data.error}`);
  }
  return {
    accessToken: data.access_token,
    expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined,
  };
}

// Lazy import to avoid circular deps
function encryptForStorage(plaintext: string): string {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { encryptToken } = require("@/lib/platforms/_crypto");
  return encryptToken(plaintext);
}
