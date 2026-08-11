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

/**
 * GET /api/tags
 * List all tags for the current user's org, with conversation counts.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tags = await db.tag.findMany({
    where: { orgId: user.orgId },
    include: {
      _count: { select: { conversations: true } },
    },
    orderBy: [{ name: "asc" }],
  });

  return NextResponse.json({
    tags: tags.map((t) => ({
      id: t.id,
      name: t.name,
      color: t.color,
      conversations: t._count.conversations,
      createdAt: t.createdAt,
    })),
  });
}

const createSchema = z.object({
  name: z.string().trim().min(1).max(40),
  color: z.enum(ALLOWED_COLORS).optional().default("violet"),
});

/**
 * POST /api/tags
 * Body: { name, color? }
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { name, color } = parsed.data;

  // Prevent duplicates (schema has @@unique([orgId, name]))
  const existing = await db.tag.findUnique({
    where: { orgId_name: { orgId: user.orgId, name } },
  });
  if (existing) {
    return NextResponse.json(
      { error: "A tag with that name already exists" },
      { status: 409 }
    );
  }

  const tag = await db.tag.create({
    data: {
      orgId: user.orgId,
      name,
      color: color as TagColor,
    },
    include: { _count: { select: { conversations: true } } },
  });

  return NextResponse.json(
    {
      tag: {
        id: tag.id,
        name: tag.name,
        color: tag.color,
        conversations: tag._count.conversations,
        createdAt: tag.createdAt,
      },
    },
    { status: 201 }
  );
}
