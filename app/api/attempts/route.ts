import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { LOCAL_USER_ID } from "@/lib/constants";
import { computeMcqScore } from "@/lib/mastery";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { questionId, selectedOptionId, responseTimeMs } = body as {
    questionId?: string;
    selectedOptionId?: string;
    responseTimeMs?: number;
  };

  if (!questionId || !selectedOptionId) {
    return NextResponse.json({ error: "questionId and selectedOptionId are required" }, { status: 400 });
  }

  const db = await getDb();
  const question = await db.question.findUnique({
    where: { id: questionId },
    include: { options: true, topic: { select: { id: true, name: true } } },
  });
  if (!question) {
    return NextResponse.json({ error: "unknown question" }, { status: 404 });
  }

  const selected = question.options.find((o) => o.id === selectedOptionId);
  if (!selected) {
    return NextResponse.json({ error: "unknown option" }, { status: 400 });
  }
  const correctOption = question.options.find((o) => o.isCorrect);
  const correct = selected.isCorrect;

  await db.attempt.create({
    data: {
      userId: LOCAL_USER_ID,
      questionId,
      selectedOptionId,
      correct,
      responseTimeMs,
    },
  });

  const topicAttempts = await db.attempt.findMany({
    where: { userId: LOCAL_USER_ID, question: { topicId: question.topicId } },
    orderBy: { timestamp: "desc" },
    select: { correct: true },
  });
  const mcqScore = computeMcqScore(topicAttempts.map((a) => a.correct));

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
    topicName: question.topic.name,
    source: question.source,
    answerVerified: question.answerVerified,
    updatedMasteryScore: mcqScore,
  });
}
