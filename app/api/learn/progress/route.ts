import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { auth } from "@/lib/auth";

// Marks a checkless chunk (no checkQuestionId — a short glossary-style
// aside not worth quizzing) as read. Chunks with a real check go through
// /api/attempts instead, since answering those is graded practice.
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const { chunkId } = (await request.json()) as { chunkId?: string };
  if (!chunkId) {
    return NextResponse.json({ error: "chunkId is required" }, { status: 400 });
  }

  const db = await getDb();
  const chunk = await db.learnChunk.findUnique({ where: { id: chunkId }, select: { id: true } });
  if (!chunk) {
    return NextResponse.json({ error: "unknown chunk" }, { status: 404 });
  }

  await db.learnProgress.upsert({
    where: { userId_chunkId: { userId, chunkId } },
    update: { completedAt: new Date() },
    create: { userId, chunkId },
  });

  return NextResponse.json({ recorded: true });
}
