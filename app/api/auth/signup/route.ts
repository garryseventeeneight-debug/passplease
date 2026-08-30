import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDb } from "@/lib/db";
import { LOCAL_USER_ID } from "@/lib/constants";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { email, password } = body as { email?: string; password?: string };

  if (typeof email !== "string" || typeof password !== "string") {
    return NextResponse.json({ error: "email and password are required" }, { status: 400 });
  }
  const normalizedEmail = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const db = await getDb();

  const existing = await db.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    return NextResponse.json({ error: "An account with that email already exists" }, { status: 409 });
  }

  // The very first account created inherits whatever progress already
  // exists under the pre-auth placeholder user — this app had a single
  // shared user before accounts existed, so that history unambiguously
  // belongs to whoever signs up first. Later signups start fresh.
  const isFirstUser = (await db.user.count()) === 0;

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await db.user.create({
    data: { email: normalizedEmail, passwordHash },
  });

  if (isFirstUser) {
    await Promise.all([
      db.attempt.updateMany({ where: { userId: LOCAL_USER_ID }, data: { userId: user.id } }),
      db.mastery.updateMany({ where: { userId: LOCAL_USER_ID }, data: { userId: user.id } }),
      db.reviewCard.updateMany({ where: { userId: LOCAL_USER_ID }, data: { userId: user.id } }),
    ]);
  }

  return NextResponse.json({ id: user.id, email: user.email });
}
