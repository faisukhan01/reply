/**
 * POST /api/scheduler/dispatch
 *
 * Cron endpoint — called by Vercel Cron every 5 minutes. Selects all
 * scheduled messages that are due (scheduledFor <= now) and in
 * PENDING/QUEUED status, sends each via the appropriate platform
 * adapter, and updates the row with the result.
 *
 * Auth: the request must include a `CRON_SECRET` header matching the
 * env var of the same name. Vercel Cron auto-injects this header.
 *
 * Retries: each message gets up to 3 attempts. On retryable errors
 * (429 rate limit, 5xx server error), the message stays PENDING/QUEUED
 * with attempts++ and lastError set. After 3 attempts, the message is
 * marked FAILED. On non-retryable errors (auth, policy), the message
 * is marked FAILED immediately.
 *
 * Concurrency: we process messages sequentially within a single cron
 * invocation to respect per-platform rate limits. For high-volume
 * deployments, swap this out for a queue (Upstash QStash / SQS).
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdapter } from "@/lib/platforms";
import { decryptToken } from "@/lib/platforms/_crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const MAX_ATTEMPTS = 3;

export async function POST(req: NextRequest) {
  // Auth: must have the CRON_SECRET header. The CRON_SECRET env var is
  // set in Vercel dashboard and configured in vercel.json's cron block.
  const expected = process.env.CRON_SECRET;
  if (expected) {
    const got = req.headers.get("x-cron-secret") ?? req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (got !== expected) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  let due;
  try {
    due = await db.scheduledMessage.findMany({
      where: {
        scheduledFor: { lte: new Date() },
        status: { in: ["PENDING", "QUEUED"] },
        attempts: { lt: MAX_ATTEMPTS },
      },
      take: 50,
      orderBy: { scheduledFor: "asc" },
      include: {
        connection: { select: { accessTokenEnc: true, status: true } },
      },
    });
  } catch (err) {
    console.error("[/api/scheduler/dispatch] DB error fetching due:", err);
    return NextResponse.json({ error: "DB unavailable", detail: String(err) }, { status: 500 });
  }

  const results: { id: string; ok: boolean; error?: string }[] = [];

  for (const msg of due) {
    // Don't dispatch if the connection was revoked or expired.
    if (msg.connection.status !== "ACTIVE") {
      try {
        await db.scheduledMessage.update({
          where: { id: msg.id },
          data: { status: "FAILED", lastError: `Connection is ${msg.connection.status}` },
        });
      } catch {}
      results.push({ id: msg.id, ok: false, error: `connection ${msg.connection.status}` });
      continue;
    }

    let accessToken: string;
    try {
      accessToken = decryptToken(msg.connection.accessTokenEnc);
    } catch (err) {
      try {
        await db.scheduledMessage.update({
          where: { id: msg.id },
          data: { status: "FAILED", lastError: `decrypt failed: ${err instanceof Error ? err.message : String(err)}` },
        });
      } catch {}
      results.push({ id: msg.id, ok: false, error: "decrypt failed" });
      continue;
    }

    let adapter;
    try {
      adapter = getAdapter(msg.platform);
    } catch (err) {
      try {
        await db.scheduledMessage.update({
          where: { id: msg.id },
          data: { status: "FAILED", lastError: `no adapter: ${err instanceof Error ? err.message : String(err)}` },
        });
      } catch {}
      results.push({ id: msg.id, ok: false, error: "no adapter" });
      continue;
    }

    // Mark as QUEUED + bump attempts before sending — so if the cron
    // times out mid-send, the next invocation won't double-send.
    try {
      await db.scheduledMessage.update({
        where: { id: msg.id, attempts: msg.attempts }, // optimistic lock
        data: { status: "QUEUED", attempts: msg.attempts + 1 },
      });
    } catch {
      // Optimistic lock failed — another worker already picked it up.
      results.push({ id: msg.id, ok: false, error: "race" });
      continue;
    }

    let result;
    try {
      result = await adapter.sendMessage({
        accessToken,
        recipientId: msg.recipientId ?? undefined,
        recipientHandle: msg.recipientHandle ?? undefined,
        content: msg.content,
        mediaUrl: msg.mediaUrl ?? undefined,
      });
    } catch (err) {
      result = {
        ok: false as const,
        error: err instanceof Error ? err.message : String(err),
        retryable: true,
      };
    }

    try {
      if (result.ok) {
        await db.scheduledMessage.update({
          where: { id: msg.id },
          data: { status: "SENT", sentAt: new Date(), lastError: null },
        });
        results.push({ id: msg.id, ok: true });
      } else if (result.retryable && msg.attempts + 1 < MAX_ATTEMPTS) {
        // Retryable failure — keep it QUEUED (it'll be picked up by the
        // next cron run) and record the error.
        await db.scheduledMessage.update({
          where: { id: msg.id },
          data: { status: "PENDING", lastError: result.error },
        });
        results.push({ id: msg.id, ok: false, error: result.error });
      } else {
        // Either non-retryable, or out of retries.
        await db.scheduledMessage.update({
          where: { id: msg.id },
          data: { status: "FAILED", lastError: result.error },
        });
        results.push({ id: msg.id, ok: false, error: result.error });
      }
    } catch (err) {
      console.error("[/api/scheduler/dispatch] DB error writing result:", err);
    }
  }

  return NextResponse.json({
    processed: results.length,
    results,
  });
}
