import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

// GET /api/settings — org info + members
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const org = await db.organization.findUnique({
    where: { id: user.orgId },
    select: {
      id: true,
      name: true,
      slug: true,
      plan: true,
      createdAt: true,
      users: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!org) {
    return NextResponse.json({ error: "Org not found" }, { status: 404 });
  }

  return NextResponse.json({ org, currentUserId: user.id, currentUserRole: user.role });
}

// PATCH /api/settings — update org name
export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    if (!name || name.length < 2) {
      return NextResponse.json(
        { error: "Name must be at least 2 characters" },
        { status: 400 }
      );
    }

    const updated = await db.organization.update({
      where: { id: user.orgId },
      data: { name },
      select: {
        id: true,
        name: true,
        slug: true,
        plan: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ org: updated });
  } catch (e) {
    console.error("[settings PATCH] error", e);
    return NextResponse.json(
      { error: "Failed to update organization" },
      { status: 500 }
    );
  }
}
