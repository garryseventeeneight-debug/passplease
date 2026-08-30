import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const db = await getDb();
  const question = await db.question.findUnique({
    where: { id },
    include: {
      subject: { select: { name: true, slug: true } },
      topic: { select: { name: true } },
      subtopic: { select: { name: true } },
      options: { select: { id: true, text: true, isCorrect: true, order: true }, orderBy: { order: "asc" } },
    },
  });
  if (!question) return NextResponse.json({ error: "unknown question" }, { status: 404 });

  return NextResponse.json({
    id: question.id,
    questionText: question.questionText,
    explanation: question.explanation,
    source: question.source,
    sourceUrl: question.sourceUrl,
    sourceYear: question.sourceYear,
    sourcePaper: question.sourcePaper,
    difficulty: question.difficulty,
    subjectName: question.subject.name,
    subjectSlug: question.subject.slug,
    topicName: question.topic.name,
    subtopicName: question.subtopic?.name ?? null,
    isAiGenerated: question.isAiGenerated,
    answerVerified: question.answerVerified,
    imageData: question.imageData,
    flaggedWrong: question.flaggedWrong,
    flagNote: question.flagNote,
    options: question.options.map((o) => ({ id: o.id, text: o.text, isCorrect: o.isCorrect })),
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const { flaggedWrong, flagNote } = body as { flaggedWrong?: boolean; flagNote?: string | null };

  const db = await getDb();
  const existing = await db.question.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "unknown question" }, { status: 404 });

  const updated = await db.question.update({
    where: { id },
    data: {
      ...(typeof flaggedWrong === "boolean" ? { flaggedWrong } : {}),
      ...(flagNote !== undefined ? { flagNote } : {}),
    },
    select: { flaggedWrong: true, flagNote: true },
  });

  return NextResponse.json(updated);
}
