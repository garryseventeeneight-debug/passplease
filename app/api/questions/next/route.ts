import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { auth } from "@/lib/auth";
import { ASSORTED_SLUG } from "@/lib/constants";
import { pickNextQuestion, pickScaffoldQuestion } from "@/lib/selection";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const subjectSlug = request.nextUrl.searchParams.get("subject");
  const excludeId = request.nextUrl.searchParams.get("exclude") ?? undefined;
  const topicId = request.nextUrl.searchParams.get("topic") ?? undefined;
  const subtopicId = request.nextUrl.searchParams.get("subtopic") ?? undefined;

  if (!subjectSlug) {
    return NextResponse.json({ error: "subject is required" }, { status: 400 });
  }

  const db = await getDb();
  const isAssorted = subjectSlug === ASSORTED_SLUG;

  let subjectId: string | undefined;
  if (!isAssorted) {
    const subject = await db.subject.findUnique({ where: { slug: subjectSlug } });
    if (!subject) {
      return NextResponse.json({ error: "unknown subject" }, { status: 404 });
    }
    subjectId = subject.id;
  }

  const questions = await db.question.findMany({
    where: {
      ...(subjectId ? { subjectId } : {}),
      ...(topicId ? { topicId } : {}),
      ...(subtopicId ? { subtopicId } : {}),
      type: "MCQ",
      isTestFixture: false,
      isScaffold: false,
    },
    select: { id: true, topicId: true },
  });

  const attempts = await db.attempt.findMany({
    where: { userId, question: { ...(subjectId ? { subjectId } : {}), isScaffold: false } },
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

  // Concept ladder: for a topic the learner is weak in (or new to), serve a
  // small single-concept warm-up before the full past-paper question, so
  // several unfamiliar ideas never have to be juggled at once. Takes
  // priority over everything else below, including spaced-repetition due
  // reviews — understanding the concept comes before reviewing it.
  const scaffolds = await db.question.findMany({
    where: {
      ...(subjectId ? { subjectId } : {}),
      ...(topicId ? { topicId } : {}),
      ...(subtopicId ? { subtopicId } : {}),
      type: "MCQ",
      isScaffold: true,
    },
    select: { id: true, topicId: true, scaffoldOrder: true },
  });
  if (scaffolds.length > 0) {
    const clearedScaffolds = await db.attempt.findMany({
      where: { userId, correct: true, questionId: { in: scaffolds.map((s) => s.id) } },
      select: { questionId: true },
    });
    const clearedIds = new Set(clearedScaffolds.map((a) => a.questionId));
    const pickedScaffold = pickScaffoldQuestion(scaffolds, topicAccuracy, clearedIds, {
      excludeId,
    });
    if (pickedScaffold) {
      const full = await db.question.findUnique({
        where: { id: pickedScaffold.id },
        include: {
          subject: { select: { name: true } },
          topic: { select: { name: true } },
          options: { select: { id: true, text: true, order: true } },
        },
      });
      return NextResponse.json({
        question: full && {
          id: full.id,
          questionText: full.questionText,
          subjectName: full.subject.name,
          topicName: full.topic.name,
          difficulty: full.difficulty,
          source: full.source,
          isAiGenerated: full.isAiGenerated,
          answerVerified: full.answerVerified,
          imageData: full.imageData,
          isScaffold: true,
          options: full.options
            .map((o) => ({ id: o.id, text: o.text }))
            .sort(() => Math.random() - 0.5),
        },
      });
    }
  }

  if (questions.length === 0) {
    return NextResponse.json({ question: null });
  }

  // Spaced repetition: a question that's actually due for review takes
  // priority over the usual weak-topic pool, same as a real SRS queue.
  const dueCards = await db.reviewCard.findMany({
    where: {
      userId,
      due: { lte: new Date() },
      question: { id: { in: questions.map((q) => q.id) } },
    },
    select: { questionId: true },
  });
  const duePool =
    dueCards.length > 0
      ? questions.filter((q) => dueCards.some((c) => c.questionId === q.id))
      : null;

  const picked = pickNextQuestion(duePool ?? questions, topicAccuracy, { excludeId });
  if (!picked) {
    return NextResponse.json({ question: null });
  }

  const full = await db.question.findUnique({
    where: { id: picked.id },
    include: {
      subject: { select: { name: true } },
      topic: { select: { name: true } },
      options: { select: { id: true, text: true, order: true } },
    },
  });

  return NextResponse.json({
    question: full && {
      id: full.id,
      questionText: full.questionText,
      subjectName: full.subject.name,
      topicName: full.topic.name,
      difficulty: full.difficulty,
      source: full.source,
      isAiGenerated: full.isAiGenerated,
      answerVerified: full.answerVerified,
      imageData: full.imageData,
      isScaffold: false,
      options: full.options
        .map((o) => ({ id: o.id, text: o.text }))
        .sort(() => Math.random() - 0.5),
    },
  });
}
