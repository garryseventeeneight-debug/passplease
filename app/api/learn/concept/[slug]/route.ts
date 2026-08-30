import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { auth } from "@/lib/auth";
import { resolveLinkTargets } from "@/lib/learn-links";

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const userId = session.user.id;
  const { slug } = await params;

  const db = await getDb();
  const chunk = await db.learnChunk.findUnique({
    where: { slug },
    include: {
      topic: { select: { id: true, name: true, subject: { select: { slug: true, name: true } } } },
      subtopic: { select: { name: true } },
      checkQuestion: {
        select: { id: true, questionText: true, options: { select: { id: true, text: true }, orderBy: { order: "asc" } } },
      },
    },
  });
  if (!chunk) {
    return NextResponse.json({ error: "unknown concept" }, { status: 404 });
  }

  const [progress, linkTargets] = await Promise.all([
    db.learnProgress.findUnique({ where: { userId_chunkId: { userId, chunkId: chunk.id } } }),
    resolveLinkTargets([chunk]),
  ]);

  return NextResponse.json({
    id: chunk.id,
    slug: chunk.slug,
    heading: chunk.heading,
    body: chunk.body,
    checkQuestionId: chunk.checkQuestion?.id ?? null,
    checkText: chunk.checkQuestion?.questionText ?? null,
    options: chunk.checkQuestion?.options.map((o) => ({ id: o.id, text: o.text })) ?? [],
    completed: progress !== null,
    topicId: chunk.topic.id,
    topicName: chunk.topic.name,
    subtopicName: chunk.subtopic?.name ?? null,
    subjectSlug: chunk.topic.subject.slug,
    subjectName: chunk.topic.subject.name,
    linkTargets,
  });
}
