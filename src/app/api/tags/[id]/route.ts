import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

const ALLOWED_COLORS = [
  "violet",
  "emerald",
  "amber",
  "fuchsia",
  "rose",
  "sky",
] as const;
type TagColor = (typeof ALLOWED_COLORS)[number];

async function getOwnedTag(id: string, orgId: string) {
  const tag = await db.tag.findUnique({ where: { id } });
  if (!tag || tag.orgId !== orgId) return null;
  return tag;
}

const updateSchema = z.object({
  name: z.string().trim().min(1).max(40).optional(),
  color: z.enum(ALLOWED_COLORS).optional(),
});

/**
 * PATCH /api/tags/[id]
 * Body: { name?, color? }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const tag = await getOwnedTag(id, user.orgId);
  if (!tag) {
    return NextResponse.json({ error: "Tag not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const data: { name?: string; color?: TagColor } = {};
  if (parsed.data.name && parsed.data.name !== tag.name) {
    // Check for duplicate name within org
    const dup = await db.tag.findUnique({
      where: { orgId_name: { orgId: user.orgId, name: parsed.data.name } },
    });
    if (dup && dup.id !== id) {
      return NextResponse.json(
        { error: "A tag with that name already exists" },
        { status: 409 }
      );
    }
    data.name = parsed.data.name;
  }
  if (parsed.data.color) {
    data.color = parsed.data.color;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({
      tag: {
        id: tag.id,
        name: tag.name,
        color: tag.color,
        createdAt: tag.createdAt,
      },
    });
  }

  const updated = await db.tag.update({
    where: { id },
    data,
    include: { _count: { select: { conversations: true } } },
  });

  return NextResponse.json({
    tag: {
      id: updated.id,
      name: updated.name,
      color: updated.color,
      conversations: updated._count.conversations,
      createdAt: updated.createdAt,
    },
  });
}

/**
 * DELETE /api/tags/[id]
 * Cascades to ConversationTag entries (schema-level onDelete: Cascade).
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const tag = await getOwnedTag(id, user.orgId);
  if (!tag) {
    return NextResponse.json({ error: "Tag not found" }, { status: 404 });
  }

  await db.tag.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
