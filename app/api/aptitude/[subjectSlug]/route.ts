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
  // Shuffle each topic's pool so repeated rounds below don't always draw
  // the same questions in the same order.
  for (const list of byTopic.values()) {
    list.sort(() => Math.random() - 0.5);
  }

  // Round-robin one question per topic per pass, so the test stays spread
  // across every topic (breadth) before it goes deeper into any one of
  // them, up to a target length. Topics with no real content are skipped.
  const TARGET_LENGTH = 20;
  const pickedIds: string[] = [];
  const topicsWithContent = subject.topics.filter((t) => (byTopic.get(t.id)?.length ?? 0) > 0);
  outer: while (pickedIds.length < TARGET_LENGTH) {
    let drewAny = false;
    for (const topic of topicsWithContent) {
      const list = byTopic.get(topic.id)!;
      const next = list.pop();
      if (next) {
        pickedIds.push(next);
        drewAny = true;
        if (pickedIds.length >= TARGET_LENGTH) break outer;
      }
    }
    if (!drewAny) break;
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
