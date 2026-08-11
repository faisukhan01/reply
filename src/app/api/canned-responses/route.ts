import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const responses = await db.cannedResponse.findMany({
    where: { orgId: user.orgId },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ responses });
}

const schema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  shortcut: z.string().optional().nullable(),
});

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const created = await db.cannedResponse.create({
    data: { orgId: user.orgId, ...parsed.data },
  });
  return NextResponse.json({ response: created });
}
