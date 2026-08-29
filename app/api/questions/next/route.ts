import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { LOCAL_USER_ID } from "@/lib/constants";
import { pickNextQuestion } from "@/lib/selection";

export async function GET(request: NextRequest) {
  const subjectSlug = request.nextUrl.searchParams.get("subject");
  const excludeId = request.nextUrl.searchParams.get("exclude") ?? undefined;

  if (!subjectSlug) {
    return NextResponse.json({ error: "subject is required" }, { status: 400 });
  }

  const db = await getDb();
  const subject = await db.subject.findUnique({ where: { slug: subjectSlug } });
  if (!subject) {
    return NextResponse.json({ error: "unknown subject" }, { status: 404 });
  }

  const questions = await db.question.findMany({
    where: { subjectId: subject.id, type: "MCQ", isTestFixture: false },
    select: { id: true, topicId: true },
  });

  if (questions.length === 0) {
    return NextResponse.json({ question: null });
  }

  const attempts = await db.attempt.findMany({
    where: { userId: LOCAL_USER_ID, question: { subjectId: subject.id } },
    select: { correct: true, question: { select: { topicId: true } } },
  });

  const byTopic = new Map<string, { correct: number; total: number }>();
  for (const a of attempts) {
    const stat = byTopic.get(a.question.topicId) ?? { correct: 0, total: 0 };
    stat.total += 1;
    if (a.correct) stat.correct += 1;
    byTopic.set(a.question.topicId, stat);
  }
  const topicAccuracy = new Map<string, number>();
  for (const [topicId, stat] of byTopic) {
    topicAccuracy.set(topicId, stat.correct / stat.total);
  }

  const picked = pickNextQuestion(questions, topicAccuracy, { excludeId });
  if (!picked) {
    return NextResponse.json({ question: null });
  }

  const full = await db.question.findUnique({
    where: { id: picked.id },
    include: {
      topic: { select: { name: true } },
      options: { select: { id: true, text: true, order: true } },
    },
  });

  return NextResponse.json({
    question: full && {
      id: full.id,
      questionText: full.questionText,
      topicName: full.topic.name,
      difficulty: full.difficulty,
      source: full.source,
      isAiGenerated: full.isAiGenerated,
      answerVerified: full.answerVerified,
      options: full.options
        .map((o) => ({ id: o.id, text: o.text }))
        .sort(() => Math.random() - 0.5),
    },
  });
}
