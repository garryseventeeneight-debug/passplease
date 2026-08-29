"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { QuestionCard, type PracticeQuestion } from "./QuestionCard";
import { AnswerFeedback, type AttemptFeedback } from "./AnswerFeedback";

async function fetchNextQuestion(
  subjectSlug: string,
  excludeId?: string
): Promise<PracticeQuestion | null> {
  const url = new URL("/api/questions/next", window.location.origin);
  url.searchParams.set("subject", subjectSlug);
  if (excludeId) url.searchParams.set("exclude", excludeId);
  const res = await fetch(url);
  const data = await res.json();
  return data.question;
}

export function PracticeSession({
  subjectSlug,
  subjectName,
}: {
  subjectSlug: string;
  subjectName: string;
}) {
  const [question, setQuestion] = useState<PracticeQuestion | null | undefined>(undefined);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<AttemptFeedback | null>(null);
  const [correctOptionId, setCorrectOptionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const startedAt = useRef<number>(0);

  const applyQuestion = useCallback((next: PracticeQuestion | null) => {
    setQuestion(next);
    setSelectedOptionId(null);
    setFeedback(null);
    setCorrectOptionId(null);
    setError(null);
    startedAt.current = Date.now();
  }, []);

  // Mount-only fetch: kept as an inline `.then` chain (rather than an
  // awaited call to an async helper) so the effect body never itself
  // performs a synchronous setState call.
  useEffect(() => {
    let cancelled = false;
    fetchNextQuestion(subjectSlug).then((next) => {
      if (!cancelled) applyQuestion(next);
    });
    return () => {
      cancelled = true;
    };
  }, [subjectSlug, applyQuestion]);

  async function goToNextQuestion(excludeId?: string) {
    const next = await fetchNextQuestion(subjectSlug, excludeId);
    applyQuestion(next);
  }

  async function submit() {
    if (!question || !selectedOptionId) return;
    const res = await fetch("/api/attempts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        questionId: question.id,
        selectedOptionId,
        responseTimeMs: Date.now() - startedAt.current,
      }),
    });
    if (!res.ok) {
      setError("Something went wrong recording that attempt.");
      return;
    }
    const data = await res.json();
    setCorrectOptionId(data.correctOptionId);
    setFeedback({
      correct: data.correct,
      explanation: data.explanation,
      topicName: data.topicName,
      source: data.source,
      answerVerified: data.answerVerified,
      updatedMasteryScore: data.updatedMasteryScore,
    });
  }

  if (question === undefined) {
    return <p className="text-sm text-neutral-500">Loading question…</p>;
  }

  if (question === null) {
    return (
      <p className="text-sm text-neutral-500">
        No {subjectName} questions are in the bank yet. Import or add questions to start practising.
      </p>
    );
  }

  return (
    <div>
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      <QuestionCard
        question={question}
        selectedOptionId={selectedOptionId}
        disabled={feedback !== null}
        correctOptionId={correctOptionId}
        onSelect={(id) => !feedback && setSelectedOptionId(id)}
        onSubmit={submit}
      />
      {feedback && (
        <AnswerFeedback feedback={feedback} onNext={() => goToNextQuestion(question.id)} />
      )}
    </div>
  );
}
