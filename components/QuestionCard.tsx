"use client";

import { MathText } from "./MathText";

const LETTERS = ["A", "B", "C", "D", "E", "F"];

export interface QuestionOption {
  id: string;
  text: string;
}

export interface PracticeQuestion {
  id: string;
  questionText: string;
  subjectName: string;
  topicName: string;
  difficulty: number;
  source: string;
  isAiGenerated: boolean;
  answerVerified: boolean;
  imageData: string | null;
  isScaffold: boolean;
  options: QuestionOption[];
}

export function QuestionCard({
  question,
  selectedOptionId,
  disabled,
  correctOptionId,
  onSelect,
  onSubmit,
  onDontKnow,
}: {
  question: PracticeQuestion;
  selectedOptionId: string | null;
  disabled: boolean;
  correctOptionId: string | null;
  onSelect: (optionId: string) => void;
  onSubmit: () => void;
  onDontKnow: () => void;
}) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <div className="mb-4 flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
        <span>
          {question.subjectName} · {question.topicName}
        </span>
        <span className="flex gap-2">
          {question.isScaffold && (
            <span
              className="rounded bg-blue-100 px-2 py-0.5 font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
              title="A quick single-concept warm-up before the full question on this topic."
            >
              Concept check
            </span>
          )}
          {question.isAiGenerated && (
            <span className="rounded bg-purple-100 px-2 py-0.5 font-medium text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
              AI-generated
            </span>
          )}
          {!question.answerVerified && (
            <span
              className="rounded bg-amber-100 px-2 py-0.5 font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
              title="This question is from a real past paper, but it had no answer key — the correct option was determined by AI, not an official source."
            >
              AI-solved answer
            </span>
          )}
        </span>
      </div>

      <p className="mb-5 text-lg font-medium text-neutral-900 dark:text-neutral-100">
        <MathText text={question.questionText} />
      </p>

      {question.imageData && (
        // Per-question data: URIs from the question bank, not a static asset next/image can optimize.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={question.imageData}
          alt="Diagram for this question"
          className="mb-5 max-w-full rounded-md border border-neutral-200 dark:border-neutral-700"
        />
      )}

      <div className="flex flex-col gap-2">
        {question.options.map((option, i) => {
          const isSelected = selectedOptionId === option.id;
          const isCorrect = disabled && correctOptionId === option.id;
          const isWrongSelected = disabled && isSelected && correctOptionId !== option.id;

          return (
            <button
              key={option.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(option.id)}
              className={[
                "flex items-start gap-3 rounded-md border px-4 py-3 text-left text-sm transition-colors",
                isCorrect
                  ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                  : isWrongSelected
                    ? "border-red-500 bg-red-50 dark:bg-red-900/20"
                    : isSelected
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                      : "border-neutral-200 hover:border-neutral-400 dark:border-neutral-700 dark:hover:border-neutral-500",
                disabled ? "cursor-default" : "cursor-pointer",
              ].join(" ")}
            >
              <span className="font-semibold text-neutral-500 dark:text-neutral-400">
                {LETTERS[i]}
              </span>
              <span className="text-neutral-800 dark:text-neutral-200">
                <MathText text={option.text} />
              </span>
            </button>
          );
        })}
      </div>

      {!disabled && (
        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onSubmit}
            disabled={!selectedOptionId}
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40 dark:bg-neutral-100 dark:text-neutral-900"
          >
            Submit
          </button>
          <button
            type="button"
            onClick={onDontKnow}
            className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            Don&apos;t know
          </button>
        </div>
      )}
    </div>
  );
}
