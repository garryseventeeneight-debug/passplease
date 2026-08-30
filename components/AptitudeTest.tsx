"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MathText } from "./MathText";

const LETTERS = ["A", "B", "C", "D", "E", "F"];

interface AptitudeOption {
  id: string;
  text: string;
}

interface AptitudeQuestion {
  id: string;
  questionText: string;
  topicId: string;
  topicName: string;
  imageData: string | null;
  options: AptitudeOption[];
}

interface QuestionResult {
  topicId: string;
  topicName: string;
  correct: boolean;
  dontKnow: boolean;
}

export function AptitudeTest({ subjectSlug }: { subjectSlug: string }) {
  const [questions, setQuestions] = useState<AptitudeQuestion[] | null>(null);
  const [index, setIndex] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [results, setResults] = useState<QuestionResult[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const startedAt = useRef<number>(0);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/aptitude/${subjectSlug}`)
      .then((res) => res.json())
      .then((data: { questions: AptitudeQuestion[] }) => {
        if (cancelled) return;
        setQuestions(data.questions);
        startedAt.current = Date.now();
      });
    return () => {
      cancelled = true;
    };
  }, [subjectSlug]);

  async function submitAndAdvance(body: { selectedOptionId?: string; dontKnow?: boolean }) {
    if (!questions) return;
    const question = questions[index];
    setSubmitting(true);
    const res = await fetch("/api/attempts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        questionId: question.id,
        ...body,
        responseTimeMs: Date.now() - startedAt.current,
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      setError("Something went wrong recording that answer.");
      return;
    }
    const data = await res.json();
    setResults((prev) => [
      ...prev,
      {
        topicId: question.topicId,
        topicName: question.topicName,
        correct: data.correct,
        dontKnow: Boolean(body.dontKnow),
      },
    ]);
    setSelectedOptionId(null);
    setError(null);
    startedAt.current = Date.now();
    setIndex((i) => i + 1);
  }

  if (questions === null) {
    return <p className="text-sm text-neutral-500">Loading…</p>;
  }
  if (questions.length === 0) {
    return (
      <p className="text-sm text-neutral-500">
        No questions in the bank yet for this subject — nothing to test on.
      </p>
    );
  }

  if (index >= questions.length) {
    const correctCount = results.filter((r) => r.correct).length;
    const dontKnowCount = results.filter((r) => r.dontKnow).length;

    const byTopic = new Map<string, { topicName: string; correct: number; total: number; dontKnow: number }>();
    for (const r of results) {
      const stat = byTopic.get(r.topicId) ?? { topicName: r.topicName, correct: 0, total: 0, dontKnow: 0 };
      stat.total += 1;
      if (r.correct) stat.correct += 1;
      if (r.dontKnow) stat.dontKnow += 1;
      byTopic.set(r.topicId, stat);
    }
    const topicRows = Array.from(byTopic.entries());
    const weakCount = topicRows.filter(([, s]) => s.correct < s.total).length;

    return (
      <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="mb-1 text-lg font-medium text-neutral-900 dark:text-neutral-100">
          {correctCount} / {results.length} correct
        </h2>
        <p className="mb-5 text-sm text-neutral-500 dark:text-neutral-400">
          {dontKnowCount > 0 ? `${dontKnowCount} marked "don't know". ` : ""}
          Spread across every topic — a quick snapshot, not a deep test of any single area.
        </p>
        <div className="flex flex-col divide-y divide-neutral-100 rounded-md border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
          {topicRows.map(([topicId, stat]) => (
            <div key={topicId} className="flex items-center justify-between px-4 py-2.5 text-sm">
              <span className="text-neutral-700 dark:text-neutral-300">
                {stat.topicName}{" "}
                <span className="text-neutral-400">
                  ({stat.correct}/{stat.total})
                </span>
              </span>
              {stat.correct === stat.total ? (
                <span className="text-green-600 dark:text-green-400">✓ Correct</span>
              ) : (
                <Link
                  href={`/practice/${subjectSlug}?topic=${topicId}`}
                  className={
                    stat.correct === 0 && stat.dontKnow === stat.total
                      ? "text-amber-600 hover:underline dark:text-amber-400"
                      : "text-red-600 hover:underline dark:text-red-400"
                  }
                >
                  ✗ Practice this
                </Link>
              )}
            </div>
          ))}
        </div>
        {weakCount > 0 && (
          <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">
            {weakCount} topic{weakCount === 1 ? "" : "s"} to focus on — click one above to
            practice it directly.
          </p>
        )}
        <Link
          href="/dashboard"
          className="mt-5 inline-block rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white dark:bg-neutral-100 dark:text-neutral-900"
        >
          Back to dashboard
        </Link>
      </div>
    );
  }

  const question = questions[index];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-1.5">
        {questions.map((_, i) => (
          <div
            key={i}
            className={[
              "h-2 flex-1 min-w-[16px] rounded-full",
              i < index ? "bg-neutral-400 dark:bg-neutral-600" : i === index ? "bg-neutral-900 dark:bg-neutral-100" : "bg-neutral-200 dark:bg-neutral-800",
            ].join(" ")}
          />
        ))}
      </div>
      <p className="text-xs text-neutral-500 dark:text-neutral-400">
        {question.topicName} · Question {index + 1} of {questions.length}
      </p>

      <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <p className="mb-5 text-lg font-medium text-neutral-900 dark:text-neutral-100">
          <MathText text={question.questionText} />
        </p>

        {question.imageData && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={question.imageData}
            alt="Diagram for this question"
            className="mb-5 max-w-full rounded-md border border-neutral-200 dark:border-neutral-700"
          />
        )}

        <div className="flex flex-col gap-2">
          {question.options.map((option, i) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setSelectedOptionId(option.id)}
              className={[
                "flex items-start gap-3 rounded-md border px-4 py-3 text-left text-sm transition-colors",
                selectedOptionId === option.id
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                  : "border-neutral-200 hover:border-neutral-400 dark:border-neutral-700 dark:hover:border-neutral-500",
              ].join(" ")}
            >
              <span className="font-semibold text-neutral-500 dark:text-neutral-400">{LETTERS[i]}</span>
              <span className="text-neutral-800 dark:text-neutral-200">
                <MathText text={option.text} />
              </span>
            </button>
          ))}
        </div>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={() => submitAndAdvance({ selectedOptionId: selectedOptionId! })}
            disabled={!selectedOptionId || submitting}
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40 dark:bg-neutral-100 dark:text-neutral-900"
          >
            {index === questions.length - 1 ? "Finish" : "Next"}
          </button>
          <button
            type="button"
            onClick={() => submitAndAdvance({ dontKnow: true })}
            disabled={submitting}
            className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-50 disabled:opacity-40 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            Don&apos;t know
          </button>
        </div>
      </div>
    </div>
  );
}
