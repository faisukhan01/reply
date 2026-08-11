import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

// GET /api/contacts?q=search
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";

  const where = {
    orgId: user.orgId,
    ...(q
      ? {
          OR: [
            { name: { contains: q } },
            { email: { contains: q } },
            { phone: { contains: q } },
          ],
        }
      : {}),
  };

  const contacts = await db.contact.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      source: true,
      notes: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ contacts });
}

// POST /api/contacts  body: { name, email?, phone?, notes? }
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    const email =
      typeof body?.email === "string" && body.email.trim()
        ? body.email.trim()
        : null;
    const phone =
      typeof body?.phone === "string" && body.phone.trim()
        ? body.phone.trim()
        : null;
    const notes =
      typeof body?.notes === "string" && body.notes.trim()
        ? body.notes.trim()
        : null;

    const contact = await db.contact.create({
      data: {
        orgId: user.orgId,
        name,
        email,
        phone,
        notes,
        source: "MANUAL",
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        source: true,
        notes: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ contact }, { status: 201 });
  } catch (e) {
    console.error("[contacts POST] error", e);
    return NextResponse.json(
      { error: "Failed to create contact" },
      { status: 500 }
    );
  }
}
