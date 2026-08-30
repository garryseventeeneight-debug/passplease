import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const { chunkId, optionId } = (await request.json()) as { chunkId?: string; optionId?: string };
  if (!chunkId || !optionId) {
    return NextResponse.json({ error: "chunkId and optionId are required" }, { status: 400 });
  }

  const db = await getDb();
  const chunk = await db.learnChunk.findUnique({
    where: { id: chunkId },
    include: { checkOptions: true },
  });
  if (!chunk) {
    return NextResponse.json({ error: "unknown chunk" }, { status: 404 });
  }
  const selected = chunk.checkOptions.find((o) => o.id === optionId);
  if (!selected) {
    return NextResponse.json({ error: "unknown option" }, { status: 400 });
  }
  const correctOption = chunk.checkOptions.find((o) => o.isCorrect);

  // Comprehension checks aren't a graded test — reading the passage and
  // engaging with the check is what matters, so progress is recorded on
  // any submission, not only a correct one.
  await db.learnProgress.upsert({
    where: { userId_chunkId: { userId, chunkId } },
    update: { completedAt: new Date() },
    create: { userId, chunkId },
  });

  return NextResponse.json({
    correct: selected.isCorrect,
    correctOptionId: correctOption?.id ?? null,
  });
}
