/**
 * GET/POST /api/webhooks/meta
 *
 * Meta (Facebook + Instagram + WhatsApp) webhook receiver.
 *
 * GET  — webhook verification handshake (Meta calls this once when you
 *        register the webhook in the App Dashboard). We echo back the
 *        `hub.challenge` param only if `hub.verify_token` matches
 *        `META_WEBHOOK_VERIFY_TOKEN` env var.
 * POST — inbound event payload. Meta sends entries[].messaging[]
 *        for Messenger and entries[].changes[] for Instagram/WhatsApp.
 *        We normalize each into an InboundEvent and run it through the
 *        automation engine.
 *
 * To find which org/account owns the inbound message, we look up the
 * recipient id (page id / ig business account id / wa phone number id)
 * across PlatformConnection rows. The webhook itself carries no auth
 * context — Meta signs the payload with your App Secret via the
 * `X-Hub-Signature-256` header (HMAC SHA-256 of the body). We verify
 * the signature before doing anything.
 *
 * Env vars required:
 *   - META_APP_SECRET               (used to verify X-Hub-Signature-256)
 *   - META_WEBHOOK_VERIFY_TOKEN      (any string — set the same value
 *                                     in the App Dashboard webhook config)
 */

import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { db } from "@/lib/db";
import { processInboundEvent } from "@/lib/automation/engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

function verifySignature(rawBody: string, sigHeader: string | null): boolean {
  const appSecret = process.env.META_APP_SECRET;
  if (!appSecret) {
    // If not configured, fail closed — do not process the webhook
    return false;
  }
  if (!sigHeader) return false;
  // Format: "sha256=<hex>"
  const m = sigHeader.match(/^sha256=([a-f0-9]+)$/i);
  if (!m) return false;
  const expected = createHmac("sha256", appSecret).update(rawBody).digest("hex");
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(m[1], "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get("hub.mode");
  const token = req.nextUrl.searchParams.get("hub.verify_token");
  const challenge = req.nextUrl.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token) {
    const expected = process.env.META_WEBHOOK_VERIFY_TOKEN;
    if (!expected || token !== expected) {
      return new NextResponse("Forbidden: verify token mismatch", { status: 403 });
    }
    // Meta expects the challenge as plain text
    return new NextResponse(challenge ?? "", {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }
  return new NextResponse("Bad request", { status: 400 });
}

export async function POST(req: NextRequest) {
  const sig = req.headers.get("x-hub-signature-256");
  const rawBody = await req.text();
  if (!verifySignature(rawBody, sig)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: any;
  try { payload = JSON.parse(rawBody); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Meta webhook payload: { object: "page" | "instagram" | "whatsapp_business_account",
  //   entry: [ { id, changes: [ { field, value } ] } ] }
  const object = payload.object;
  const entries: any[] = payload.entry ?? [];

  const results: any[] = [];

  for (const entry of entries) {
    const changes: any[] = entry.changes ?? [];
    for (const change of changes) {
      const field = change.field;
      const value = change.value;
      if (!value) continue;

      // Normalize the inbound into InboundEvent based on object type
      try {
        if (object === "page") {
          // Facebook Messenger inbound
          const messaging = value.messages ?? value.message;
          if (!messaging) continue;
          // value.sender.id, value.recipient.id, value.message.text
          const senderId = value.sender?.id;
          const recipientId = value.recipient?.id;  // page id
          const text = value.message?.text ?? "";
          if (!senderId || !recipientId || !text) continue;

          const conn = await findConnectionByAccountId("FACEBOOK", recipientId);
          if (!conn) continue;

          const r = await processInboundEvent({
            orgId: conn.orgId,
            platform: "FACEBOOK",
            event: "MESSAGE_RECEIVED",
            messageId: value.message?.mid,
            senderId,
            senderName: undefined,
            text,
            connectionAccountId: recipientId,
          });
          results.push(r);
        } else if (object === "instagram") {
          // Instagram DM
          const senderId = value.sender?.id;
          const recipientId = value.recipient?.id; // IG business account id
          const text = value.message?.text ?? "";
          if (!senderId || !recipientId || !text) continue;

          const conn = await findConnectionByAccountId("INSTAGRAM", recipientId);
          if (!conn) continue;

          const r = await processInboundEvent({
            orgId: conn.orgId,
            platform: "INSTAGRAM",
            event: "MESSAGE_RECEIVED",
            messageId: value.message?.mid,
            senderId,
            text,
            connectionAccountId: recipientId,
          });
          results.push(r);
        } else if (object === "whatsapp_business_account" || object === "whatsapp") {
          // WhatsApp Cloud API inbound
          // value = { messaging_product: "whatsapp",
          //   metadata: { phone_number_id, display_phone_number },
          //   messages: [ { from, id, text: { body } } ] }
          const phoneNumberId = value.metadata?.phone_number_id;
          const messages: any[] = value.messages ?? [];
          for (const m of messages) {
            const senderId = m.from; // phone number
            const text = m.text?.body ?? "";
            if (!senderId || !text || !phoneNumberId) continue;

            const conn = await findConnectionByAccountId("WHATSAPP", phoneNumberId);
            if (!conn) continue;

            const r = await processInboundEvent({
              orgId: conn.orgId,
              platform: "WHATSAPP",
              event: "MESSAGE_RECEIVED",
              messageId: m.id,
              senderId,
              text,
              connectionAccountId: phoneNumberId,
            });
            results.push(r);
          }
        }
      } catch (err) {
        console.error("[webhook/meta] error processing change:", err);
      }
    }
  }

  // Meta requires 200 OK within 5 seconds. We do all the heavy work
  // after the response is sent (fire-and-forget) — but since we're in
  // a serverless function we can't truly background work. Best-effort:
  // the processing happens inline here and we return 200 after.
  return NextResponse.json({ received: true, processed: results.length, results });
}

async function findConnectionByAccountId(platform: string, accountId: string) {
  try {
    return await db.platformConnection.findFirst({
      where: { platform, accountId, status: "ACTIVE" },
      select: { id: true, orgId: true },
    });
  } catch (err) {
    console.error("[webhook/meta] DB error finding connection:", err);
    return null;
  }
}
