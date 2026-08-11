import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

// DELETE /api/contacts/:id
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Verify ownership before deleting
  const existing = await db.contact.findUnique({ where: { id } });
  if (!existing || existing.orgId !== user.orgId) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  await db.contact.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
