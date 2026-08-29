"use client";

import { masteryLevelFor } from "@/lib/mastery";

export interface AttemptFeedback {
  correct: boolean;
  explanation: string | null;
  topicName: string;
  source: string;
  updatedMasteryScore: number;
}

export function AnswerFeedback({
  feedback,
  onNext,
}: {
  feedback: AttemptFeedback;
  onNext: () => void;
}) {
  const level = masteryLevelFor(feedback.updatedMasteryScore);

  return (
    <div className="mt-4 rounded-lg border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <p
        className={
          feedback.correct
            ? "text-lg font-semibold text-green-600 dark:text-green-400"
            : "text-lg font-semibold text-red-600 dark:text-red-400"
        }
      >
        {feedback.correct ? "Correct" : "Incorrect"}
      </p>

      {feedback.explanation && (
        <p className="mt-2 text-sm text-neutral-700 dark:text-neutral-300">{feedback.explanation}</p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-neutral-500 dark:text-neutral-400">
        <span>Topic: {feedback.topicName}</span>
        <span>Source: {feedback.source}</span>
        <span>
          Topic mastery: {level.emoji} {level.label} ({feedback.updatedMasteryScore.toFixed(0)}%)
        </span>
      </div>

      <button
        type="button"
        onClick={onNext}
        className="mt-5 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white dark:bg-neutral-100 dark:text-neutral-900"
      >
        Next question
      </button>
    </div>
  );
}
