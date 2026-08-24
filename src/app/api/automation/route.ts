/**
 * Automation Rules API
 *
 * GET    /api/automation                 → list rules for the current org
 * POST   /api/automation                 → create a rule
 * PATCH  /api/automation                → update a rule (status, conditions, action, etc.)
 * DELETE /api/automation?id=<ruleId>     → delete a rule
 *
 * GET    /api/automation?logs=1          → list recent automation logs
 *   - returns { logs: AutomationLog[] } last 100, ordered by createdAt desc
 *
 * Body schema:
 *   name:             string  required
 *   triggerPlatform:  string  required (FACEBOOK | INSTAGRAM | WHATSAPP | LINKEDIN | GOOGLE | WEB)
 *   triggerEvent:     string  required (MESSAGE_RECEIVED | COMMENT_RECEIVED | MENTION | EMAIL_RECEIVED | CALENDAR_STARTING)
 *   conditions:       Condition[]  default []
 *   actionType:       string  required (AI_REPLY | CANNED_REPLY | ESCALATE | NOTIFY | SCHEDULE_FOLLOWUP)
 *   actionConfig:     object  default {}
 *   priority:         number  default 100
 *   status:           string  default "ACTIVE" (ACTIVE | PAUSED | DRAFT)
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export async function GET(req: NextRequest) {
  let user;
  try { user = await getCurrentUser(); } catch {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const includeLogs = req.nextUrl.searchParams.get("logs") === "1";

  try {
    if (includeLogs) {
      const [rules, logs] = await Promise.all([
        db.automationRule.findMany({
          where: { orgId: user.orgId },
          orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
          take: 100,
        }),
        db.automationLog.findMany({
          where: { orgId: user.orgId },
          orderBy: { createdAt: "desc" },
          take: 50,
          include: { rule: { select: { name: true } } },
        }),
      ]);
      return NextResponse.json({ rules, logs });
    }
    const rules = await db.automationRule.findMany({
      where: { orgId: user.orgId },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      take: 200,
    });
    return NextResponse.json({ rules });
  } catch (err) {
    console.error("[/api/automation] DB error:", err);
    return NextResponse.json({ rules: [], logs: [], dbError: true });
  }
}

export async function POST(req: NextRequest) {
  let user;
  try { user = await getCurrentUser(); } catch {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { name, triggerPlatform, triggerEvent, conditions, actionType, actionConfig, priority, status } = body;
  if (!name || !triggerPlatform || !triggerEvent || !actionType) {
    return NextResponse.json(
      { error: "name, triggerPlatform, triggerEvent, actionType are required" },
      { status: 400 }
    );
  }

  const validActions = ["AI_REPLY", "CANNED_REPLY", "ESCALATE", "NOTIFY", "SCHEDULE_FOLLOWUP"];
  if (!validActions.includes(actionType)) {
    return NextResponse.json({ error: `actionType must be one of: ${validActions.join(", ")}` }, { status: 400 });
  }

  const validPlatforms = ["FACEBOOK", "INSTAGRAM", "WHATSAPP", "LINKEDIN", "GOOGLE", "WEB"];
  if (!validPlatforms.includes(triggerPlatform)) {
    return NextResponse.json({ error: `triggerPlatform must be one of: ${validPlatforms.join(", ")}` }, { status: 400 });
  }

  try {
    const rule = await db.automationRule.create({
      data: {
        orgId: user.orgId,
        name,
        status: status ?? "ACTIVE",
        triggerPlatform,
        triggerEvent,
        conditions: JSON.stringify(conditions ?? []),
        actionType,
        actionConfig: JSON.stringify(actionConfig ?? {}),
        priority: Number(priority ?? 100),
      },
    });
    return NextResponse.json({ ok: true, rule });
  } catch (err) {
    console.error("[/api/automation POST] DB error:", err);
    return NextResponse.json({ error: "DB unavailable" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  let user;
  try { user = await getCurrentUser(); } catch {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { id, ...updates } = body;
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const data: any = {};
  if (updates.name !== undefined) data.name = updates.name;
  if (updates.status !== undefined) data.status = updates.status;
  if (updates.triggerPlatform !== undefined) data.triggerPlatform = updates.triggerPlatform;
  if (updates.triggerEvent !== undefined) data.triggerEvent = updates.triggerEvent;
  if (updates.conditions !== undefined) data.conditions = JSON.stringify(updates.conditions);
  if (updates.actionType !== undefined) data.actionType = updates.actionType;
  if (updates.actionConfig !== undefined) data.actionConfig = JSON.stringify(updates.actionConfig);
  if (updates.priority !== undefined) data.priority = Number(updates.priority);

  try {
    // Make sure the rule belongs to the caller's org
    const existing = await db.automationRule.findFirst({
      where: { id, orgId: user.orgId },
      select: { id: true },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await db.automationRule.update({ where: { id }, data });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[/api/automation PATCH] DB error:", err);
    return NextResponse.json({ error: "DB unavailable" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  let user;
  try { user = await getCurrentUser(); } catch {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  try {
    const existing = await db.automationRule.findFirst({
      where: { id, orgId: user.orgId },
      select: { id: true },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await db.automationRule.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[/api/automation DELETE] DB error:", err);
    return NextResponse.json({ error: "DB unavailable" }, { status: 500 });
  }
}
