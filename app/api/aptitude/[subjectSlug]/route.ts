import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest, { params }: { params: Promise<{ subjectSlug: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { subjectSlug } = await params;

  const db = await getDb();
  const subject = await db.subject.findUnique({
    where: { slug: subjectSlug },
    include: { topics: { orderBy: { order: "asc" }, select: { id: true, name: true } } },
  });
  if (!subject) {
    return NextResponse.json({ error: "unknown subject" }, { status: 404 });
  }

  const eligible = await db.question.findMany({
    where: {
      subjectId: subject.id,
      type: "MCQ",
      isTestFixture: false,
      isScaffold: false,
    },
    select: { id: true, topicId: true },
  });

  const byTopic = new Map<string, string[]>();
  for (const q of eligible) {
    const list = byTopic.get(q.topicId) ?? [];
    list.push(q.id);
    byTopic.set(q.topicId, list);
  }

  // One question per topic — a quick, evenly-spread diagnostic snapshot
  // rather than a deep test of any single topic. Topics with no real
  // content yet are simply skipped.
  const pickedIds: string[] = [];
  for (const topic of subject.topics) {
    const ids = byTopic.get(topic.id);
    if (!ids || ids.length === 0) continue;
    pickedIds.push(ids[Math.floor(Math.random() * ids.length)]);
  }

  if (pickedIds.length === 0) {
    return NextResponse.json({ subjectName: subject.name, questions: [] });
  }

  const full = await db.question.findMany({
    where: { id: { in: pickedIds } },
    include: {
      topic: { select: { id: true, name: true } },
      options: { select: { id: true, text: true, order: true } },
    },
  });
  const byId = new Map(full.map((q) => [q.id, q]));

  return NextResponse.json({
    subjectName: subject.name,
    questions: pickedIds
      .map((id) => byId.get(id))
      .filter((q): q is NonNullable<typeof q> => q !== undefined)
      .map((q) => ({
        id: q.id,
        questionText: q.questionText,
        topicId: q.topic.id,
        topicName: q.topic.name,
        difficulty: q.difficulty,
        imageData: q.imageData,
        options: q.options
          .map((o) => ({ id: o.id, text: o.text }))
          .sort(() => Math.random() - 0.5),
      })),
  });
}
