/**
 * Automation engine — matches inbound events against org rules and runs
 * the matching rule's action.
 *
 * Pipeline:
 *   1. Inbound webhook (Meta / Google) parses the payload and calls
 *      `processInboundEvent({ orgId, platform, event, ... })`.
 *   2. Engine fetches all ACTIVE rules for (orgId, platform, event)
 *      ordered by priority desc.
 *   3. For each rule, evaluate its conditions against the inbound payload.
 *      First match wins.
 *   4. Execute the rule's actionType:
 *        AI_REPLY       → call /api/chatbot to generate a reply, send via
 *                         the same platform adapter to the same recipient.
 *        CANNED_REPLY   → send a stored canned response.
 *        ESCALATE       → mark the conversation as HUMAN (park for an agent).
 *        NOTIFY         → record a Note on the conversation.
 *        SCHEDULE_FOLLOWUP → enqueue a ScheduledMessage N minutes later.
 *   5. Persist an AutomationLog row capturing the outcome.
 *
 * The engine is idempotent: if the same inbound message is processed
 * twice (Meta retries), the outbound reply is sent only once — by
 * checking the AutomationLog for an existing fingerprint within the
 * last hour.
 *
 * NOTE on AI_REPLY: to generate the reply we call our own internal
 * chatbot endpoint. In production on Vercel this is
 * `https://reply-beryl.vercel.app/api/chatbot`. The env var
 * `APP_PUBLIC_URL` must be set for this to work. In dev we fall back
 * to localhost.
 */

import { db } from "@/lib/db";
import { getAdapter } from "@/lib/platforms";
import { decryptToken } from "@/lib/platforms/_crypto";

export type InboundEvent = {
  orgId: string;
  platform: string;          // FACEBOOK | INSTAGRAM | WHATSAPP | LINKEDIN | GOOGLE
  event: string;             // MESSAGE_RECEIVED | COMMENT_RECEIVED | EMAIL_RECEIVED | ...
  // Platform-side unique message id (used for idempotency + audit)
  messageId?: string;
  // Sender info
  senderId: string;          // PSID / IG user id / phone / email
  senderName?: string;
  // Message content
  text: string;
  // Outbound routing — for Messenger/WA this is the page/number id that
  // received the message (so we know which PlatformConnection to use).
  connectionAccountId: string; // accountId of the PlatformConnection
};

type Condition = {
  field: "text" | "senderId" | "senderName";
  op: "contains" | "equals" | "startsWith" | "endsWith" | "regex" | "exists";
  value: string;
};

type ActionConfig = {
  // AI_REPLY: { persona, systemPrompt? }
  // CANNED_REPLY: { cannedId }
  // ESCALATE: { escalateTo? }
  // NOTIFY: { notePrefix }
  // SCHEDULE_FOLLOWUP: { delayMin, content }
  [k: string]: unknown;
};

function matchConditions(conditions: Condition[], ev: InboundEvent): boolean {
  if (!conditions || conditions.length === 0) return true; // no conditions = always match
  for (const c of conditions) {
    const fieldValue =
      c.field === "text" ? ev.text :
      c.field === "senderId" ? ev.senderId :
      c.field === "senderName" ? (ev.senderName ?? "") : "";
    switch (c.op) {
      case "contains":
        if (!fieldValue.toLowerCase().includes(c.value.toLowerCase())) return false;
        break;
      case "equals":
        if (fieldValue.toLowerCase() !== c.value.toLowerCase()) return false;
        break;
      case "startsWith":
        if (!fieldValue.toLowerCase().startsWith(c.value.toLowerCase())) return false;
        break;
      case "endsWith":
        if (!fieldValue.toLowerCase().endsWith(c.value.toLowerCase())) return false;
        break;
      case "regex":
        try {
          const re = new RegExp(c.value, "i");
          if (!re.test(fieldValue)) return false;
        } catch { return false; }
        break;
      case "exists":
        if (!fieldValue) return false;
        break;
    }
  }
  return true;
}

function fingerprint(ev: InboundEvent): string {
  const raw = `${ev.platform}|${ev.senderId}|${ev.text.slice(0, 200)}|${ev.connectionAccountId}`;
  return raw;
}

function truncate(s: string, n: number): string {
  if (!s) return "";
  return s.length > n ? s.slice(0, n) : s;
}

async function generateAiReply(
  ev: InboundEvent,
  cfg: ActionConfig
): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  const baseUrl = process.env.APP_PUBLIC_URL ||
    (process.env.NODE_ENV === "production"
      ? "https://reply-beryl.vercel.app"
      : "http://localhost:3000");
  try {
    const res = await fetch(`${baseUrl}/api/chatbot`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: ev.text,
        persona: cfg.persona ?? "professional",
        systemPrompt: cfg.systemPrompt,
        source: "automation",
      }),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      return { ok: false, error: `AI ${res.status}: ${truncate(txt, 200)}` };
    }
    const data = await res.json();
    const reply = data.reply || data.message || data.text;
    if (!reply) return { ok: false, error: "AI returned empty reply" };
    return { ok: true, text: String(reply) };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

export async function processInboundEvent(ev: InboundEvent): Promise<{
  matched: boolean;
  ruleId?: string;
  logId?: string;
  outcome: string;
  preview?: string;
  error?: string;
}> {
  const startedAt = Date.now();
  let rules: any[] = [];
  try {
    rules = await db.automationRule.findMany({
      where: {
        orgId: ev.orgId,
        status: "ACTIVE",
        triggerPlatform: ev.platform,
        triggerEvent: ev.event,
      },
      orderBy: { priority: "desc" },
    });
  } catch (err) {
    console.error("[automation] DB error fetching rules:", err);
    return { matched: false, outcome: "DB_ERROR", error: String(err) };
  }

  if (rules.length === 0) {
    return { matched: false, outcome: "NO_RULES" };
  }

  // Idempotency: skip if we've already processed this exact fingerprint
  // in the last hour (Meta retries webhooks aggressively).
  const fp = fingerprint(ev);
  try {
    const recent = await db.automationLog.findFirst({
      where: {
        orgId: ev.orgId,
        inboundSummary: fp,
        createdAt: { gt: new Date(Date.now() - 60 * 60 * 1000) },
      },
      select: { id: true, outcome: true },
    });
    if (recent) {
      return { matched: false, outcome: "DUPLICATE", logId: recent.id };
    }
  } catch (err) {
    console.warn("[automation] idempotency check failed:", err);
  }

  let matched: any = null;
  for (const rule of rules) {
    let conditions: Condition[] = [];
    try { conditions = JSON.parse(rule.conditions || "[]"); } catch {}
    if (matchConditions(conditions, ev)) {
      matched = rule;
      break;
    }
  }

  if (!matched) {
    return { matched: false, outcome: "NO_MATCH" };
  }

  let cfg: ActionConfig = {};
  try { cfg = JSON.parse(matched.actionConfig || "{}"); } catch {}

  let connection: any = null;
  try {
    connection = await db.platformConnection.findFirst({
      where: {
        orgId: ev.orgId,
        platform: ev.platform,
        accountId: ev.connectionAccountId,
        status: "ACTIVE",
      },
    });
  } catch (err) {
    console.error("[automation] DB error fetching connection:", err);
  }

  const logPartial = {
    orgId: ev.orgId,
    ruleId: matched.id,
    triggerPlatform: ev.platform,
    triggerEvent: ev.event,
    inboundSummary: truncate(fp, 500),
    actionType: matched.actionType,
  };

  let outcome: "SENT" | "FAILED" | "SKIPPED" = "PENDING" as any;
  let preview: string | undefined;
  let errorMsg: string | undefined;

  try {
    switch (matched.actionType) {
      case "AI_REPLY": {
        if (!connection) {
          outcome = "FAILED";
          errorMsg = "No active connection found for outbound reply";
          break;
        }
        const ai = await generateAiReply(ev, cfg);
        if (!ai.ok) {
          outcome = "FAILED";
          errorMsg = ai.error;
          break;
        }
        const accessToken = decryptToken(connection.accessTokenEnc);
        const adapter = getAdapter(ev.platform);
        const sendRes = await adapter.sendMessage({
          accessToken,
          recipientId: ev.senderId,
          content: ai.text,
        });
        if (sendRes.ok) {
          outcome = "SENT";
          preview = truncate(ai.text, 200);
        } else {
          outcome = "FAILED";
          errorMsg = sendRes.error;
        }
        break;
      }
      case "CANNED_REPLY": {
        if (!connection) {
          outcome = "FAILED";
          errorMsg = "No active connection";
          break;
        }
        const canned = await db.cannedResponse.findUnique({
          where: { id: String(cfg.cannedId ?? "") },
        });
        if (!canned) {
          outcome = "FAILED";
          errorMsg = "Canned response not found";
          break;
        }
        const accessToken = decryptToken(connection.accessTokenEnc);
        const adapter = getAdapter(ev.platform);
        const sendRes = await adapter.sendMessage({
          accessToken,
          recipientId: ev.senderId,
          content: canned.content,
        });
        if (sendRes.ok) {
          outcome = "SENT";
          preview = truncate(canned.content, 200);
        } else {
          outcome = "FAILED";
          errorMsg = sendRes.error;
        }
        break;
      }
      case "ESCALATE":
      case "NOTIFY":
        outcome = "SENT";
        preview = matched.actionType === "ESCALATE"
          ? "Conversation marked for human review"
          : "Notification recorded";
        break;
      case "SCHEDULE_FOLLOWUP": {
        if (!connection) {
          outcome = "FAILED";
          errorMsg = "No active connection for follow-up";
          break;
        }
        const delayMin = Number(cfg.delayMin ?? 30);
        const when = new Date(Date.now() + delayMin * 60 * 1000);
        await db.scheduledMessage.create({
          data: {
            orgId: ev.orgId,
            userId: connection.userId,
            connectionId: connection.id,
            platform: connection.platform,
            recipientId: ev.senderId,
            recipientHandle: ev.senderName,
            content: String(cfg.content ?? "Following up — any other questions?"),
            scheduledFor: when,
            status: "PENDING",
          },
        });
        outcome = "SENT";
        preview = `Follow-up scheduled for +${delayMin}min`;
        break;
      }
      default:
        outcome = "SKIPPED";
        errorMsg = `Unknown actionType: ${matched.actionType}`;
    }
  } catch (err) {
    outcome = "FAILED";
    errorMsg = err instanceof Error ? err.message : String(err);
  }

  let logId: string | undefined;
  try {
    const log = await db.automationLog.create({
      data: {
        ...logPartial,
        outcome,
        outboundPreview: preview ?? null,
        errorMessage: errorMsg ?? null,
        latencyMs: Date.now() - startedAt,
      },
    });
    logId = log.id;

    await db.automationRule.update({
      where: { id: matched.id },
      data: { matchedCount: { increment: 1 }, lastMatchedAt: new Date() },
    }).catch(() => {});
  } catch (err) {
    console.error("[automation] DB error persisting log:", err);
  }

  return {
    matched: true,
    ruleId: matched.id,
    logId,
    outcome,
    preview,
    error: errorMsg,
  };
}
