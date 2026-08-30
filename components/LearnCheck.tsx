"use client";

import { type ReactNode, useState } from "react";
import { WikiText, type WikiLinkTarget } from "./WikiText";

interface CheckOption {
  id: string;
  text: string;
}

interface CheckFeedback {
  correct: boolean;
  correctOptionId: string | null;
}

// The check UI + grading call, shared between the sequential Learn walk
// (LearnSession) and a standalone concept page's optional "Quick check" —
// `afterFeedback` lets each caller decide what happens once an answer has
// been recorded (advance to the next chunk, show nothing, etc.) without
// duplicating the question/options/feedback rendering itself.
export function LearnCheck({
  chunkId,
  questionId,
  checkText,
  options,
  linkTargets,
  onComplete,
  afterFeedback,
}: {
  chunkId: string;
  questionId: string;
  checkText: string;
  options: CheckOption[];
  linkTargets: Record<string, WikiLinkTarget>;
  onComplete?: (correct: boolean) => void;
  afterFeedback?: (feedback: CheckFeedback) => ReactNode;
}) {
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<CheckFeedback | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!selectedOptionId) return;
    // This check IS a real practice question — grading through the same
    // endpoint practice uses means it counts toward this topic's mastery
    // and FSRS scheduling, not a separate ungraded score. learnChunkId
    // additionally marks the chunk read for the guided walk's progress.
    const res = await fetch("/api/attempts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId, selectedOptionId, learnChunkId: chunkId }),
    });
    if (!res.ok) {
      setError("Something went wrong recording that.");
      return;
    }
    const data = await res.json();
    setFeedback({ correct: data.correct, correctOptionId: data.correctOptionId });
    onComplete?.(data.correct);
  }

  return (
    <div>
      <p className="mb-3 text-sm font-medium text-neutral-800 dark:text-neutral-200">
        <WikiText text={checkText} linkTargets={linkTargets} />
      </p>
      <div className="flex flex-col gap-2">
        {options.map((option) => {
          const isSelected = selectedOptionId === option.id;
          const isCorrect = feedback && feedback.correctOptionId === option.id;
          const isWrongSelected = feedback && isSelected && !isCorrect;
          return (
            <button
              key={option.id}
              type="button"
              disabled={feedback !== null}
              onClick={() => !feedback && setSelectedOptionId(option.id)}
              className={[
                "rounded-md border px-4 py-2.5 text-left text-sm transition-colors",
                isCorrect
                  ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                  : isWrongSelected
                    ? "border-red-500 bg-red-50 dark:bg-red-900/20"
                    : isSelected
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                      : "border-neutral-200 hover:border-neutral-400 dark:border-neutral-700 dark:hover:border-neutral-500",
                feedback ? "cursor-default" : "cursor-pointer",
              ].join(" ")}
            >
              <WikiText text={option.text} linkTargets={linkTargets} />
            </button>
          );
        })}
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {!feedback && (
        <button
          type="button"
          onClick={submit}
          disabled={!selectedOptionId}
          className="mt-4 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40 dark:bg-neutral-100 dark:text-neutral-900"
        >
          Submit
        </button>
      )}

      {feedback && (
        <div className="mt-4">
          <p
            className={
              feedback.correct
                ? "text-sm font-semibold text-green-600 dark:text-green-400"
                : "text-sm font-semibold text-amber-600 dark:text-amber-400"
            }
          >
            {feedback.correct ? "That's right." : "Not quite — take another look above."}
          </p>
          {afterFeedback?.(feedback)}
        </div>
      )}
    </div>
  );
}
