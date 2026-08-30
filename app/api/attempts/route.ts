import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { LOCAL_USER_ID } from "@/lib/constants";
import { computeMcqScore } from "@/lib/mastery";
import { nextReviewState, type ReviewCardState } from "@/lib/fsrs";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { questionId, selectedOptionId, dontKnow, responseTimeMs } = body as {
    questionId?: string;
    selectedOptionId?: string;
    dontKnow?: boolean;
    responseTimeMs?: number;
  };

  if (!questionId || (!selectedOptionId && !dontKnow)) {
    return NextResponse.json(
      { error: "questionId and either selectedOptionId or dontKnow are required" },
      { status: 400 }
    );
  }

  const db = await getDb();

  // Independent reads — no reason to wait on one before starting the other.
  const [question, existingCard] = await Promise.all([
    db.question.findUnique({
      where: { id: questionId },
      include: {
        options: true,
        subject: { select: { name: true } },
        topic: { select: { id: true, name: true } },
      },
    }),
    db.reviewCard.findUnique({
      where: { userId_questionId: { userId: LOCAL_USER_ID, questionId } },
    }),
  ]);
  if (!question) {
    return NextResponse.json({ error: "unknown question" }, { status: 404 });
  }

  let correct = false;
  if (!dontKnow) {
    const selected = question.options.find((o) => o.id === selectedOptionId);
    if (!selected) {
      return NextResponse.json({ error: "unknown option" }, { status: 400 });
    }
    correct = selected.isCorrect;
  }
  const correctOption = question.options.find((o) => o.isCorrect);

  const nextState: ReviewCardState = nextReviewState(
    existingCard
      ? {
          due: existingCard.due,
          stability: existingCard.stability,
          difficulty: existingCard.difficulty,
          elapsedDays: existingCard.elapsedDays,
          scheduledDays: existingCard.scheduledDays,
          reps: existingCard.reps,
          lapses: existingCard.lapses,
          state: existingCard.state,
          learningSteps: existingCard.learningSteps,
          lastReview: existingCard.lastReview,
        }
      : null,
    correct
  );

  // The new attempt's own correctness is already known here, so the prior-
  // history read doesn't need to wait on the write — running everything
  // independent together (instead of write-then-read-back) cuts the round
  // trips this needs on a remote database, which is where per-request
  // latency actually lives.
  const [, priorAttempts] = await Promise.all([
    db.attempt.create({
      data: {
        userId: LOCAL_USER_ID,
        questionId,
        selectedOptionId: dontKnow ? null : selectedOptionId,
        correct,
        dontKnow: Boolean(dontKnow),
        responseTimeMs,
      },
    }),
    db.attempt.findMany({
      where: { userId: LOCAL_USER_ID, question: { topicId: question.topicId } },
      orderBy: { timestamp: "desc" },
      select: { correct: true },
      take: 20,
    }),
    db.reviewCard.upsert({
      where: { userId_questionId: { userId: LOCAL_USER_ID, questionId } },
      update: nextState,
      create: { userId: LOCAL_USER_ID, questionId, ...nextState },
    }),
  ]);
  const mcqScore = computeMcqScore([correct, ...priorAttempts.map((a) => a.correct)]);

  await db.mastery.upsert({
    where: { userId_topicId: { userId: LOCAL_USER_ID, topicId: question.topicId } },
    update: { mcqScore, masteryScore: mcqScore },
    create: {
      userId: LOCAL_USER_ID,
      subjectId: question.subjectId,
      topicId: question.topicId,
      mcqScore,
      masteryScore: mcqScore,
    },
  });

  return NextResponse.json({
    correct,
    correctOptionId: correctOption?.id ?? null,
    explanation: question.explanation,
    subjectName: question.subject.name,
    topicName: question.topic.name,
    source: question.source,
    answerVerified: question.answerVerified,
    updatedMasteryScore: mcqScore,
    nextReviewDue: nextState.due,
  });
}
