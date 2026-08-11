import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const existing = await db.cannedResponse.findUnique({ where: { id } });
  if (!existing || existing.orgId !== user.orgId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.cannedResponse.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
