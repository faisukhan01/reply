import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

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
