import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { auth } from "@/lib/auth";
import { resolveLinkTargets } from "@/lib/learn-links";

export async function GET(request: NextRequest, { params }: { params: Promise<{ topicId: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const userId = session.user.id;
  const { topicId } = await params;

  const db = await getDb();

  const [topic, chunks, progress] = await Promise.all([
    db.topic.findUnique({ where: { id: topicId }, select: { name: true } }),
    db.learnChunk.findMany({
      where: { topicId },
      orderBy: { order: "asc" },
      include: {
        subtopic: { select: { name: true } },
        checkOptions: { select: { id: true, text: true }, orderBy: { order: "asc" } },
      },
    }),
    db.learnProgress.findMany({
      where: { userId, chunk: { topicId } },
      select: { chunkId: true },
    }),
  ]);

  if (!topic) {
    return NextResponse.json({ error: "unknown topic" }, { status: 404 });
  }

  const completedIds = new Set(progress.map((p) => p.chunkId));
  const linkTargets = await resolveLinkTargets(chunks);

  return NextResponse.json({
    topicName: topic.name,
    linkTargets,
    chunks: chunks.map((c) => ({
      id: c.id,
      order: c.order,
      subtopicName: c.subtopic?.name ?? null,
      heading: c.heading,
      body: c.body,
      checkText: c.checkText,
      options: c.checkOptions.map((o) => ({ id: o.id, text: o.text })),
      completed: completedIds.has(c.id),
    })),
  });
}
