import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

// PATCH /api/settings/members — change a member's role
// body: { memberId, role }
export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only OWNER can change roles
  if (user.role !== "OWNER") {
    return NextResponse.json(
      { error: "Only the organization owner can change roles" },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const memberId = typeof body?.memberId === "string" ? body.memberId : "";
    const newRole =
      typeof body?.role === "string" &&
      ["OWNER", "ADMIN", "AGENT"].includes(body.role.toUpperCase())
        ? body.role.toUpperCase()
        : "";

    if (!memberId || !newRole) {
      return NextResponse.json(
        { error: "memberId and a valid role (OWNER, ADMIN, AGENT) are required" },
        { status: 400 }
      );
    }

    // Cannot change own role
    if (memberId === user.id) {
      return NextResponse.json(
        { error: "You cannot change your own role" },
        { status: 400 }
      );
    }

    // Verify the target member belongs to the same org
    const target = await db.user.findUnique({ where: { id: memberId } });
    if (!target || target.orgId !== user.orgId) {
      return NextResponse.json(
        { error: "Member not found in your organization" },
        { status: 404 }
      );
    }

    const updated = await db.user.update({
      where: { id: memberId },
      data: { role: newRole },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    return NextResponse.json({ user: updated });
  } catch (e) {
    console.error("[settings members PATCH] error", e);
    return NextResponse.json(
      { error: "Failed to update member role" },
      { status: 500 }
    );
  }
}

// POST /api/settings/members — invite a team member
// body: { name, email, password, role }
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const email =
      typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const password =
      typeof body?.password === "string" ? body.password : "";
    const role =
      typeof body?.role === "string" &&
      ["AGENT", "ADMIN"].includes(body.role.toUpperCase())
        ? body.role.toUpperCase()
        : "AGENT";

    if (!name || name.length < 2) {
      return NextResponse.json(
        { error: "Name must be at least 2 characters" },
        { status: 400 }
      );
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "A valid email is required" },
        { status: 400 }
      );
    }
    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const created = await db.user.create({
      data: {
        name,
        email,
        passwordHash,
        role,
        orgId: user.orgId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ user: created }, { status: 201 });
  } catch (e) {
    console.error("[settings members POST] error", e);
    return NextResponse.json(
      { error: "Failed to invite member" },
      { status: 500 }
    );
  }
}
