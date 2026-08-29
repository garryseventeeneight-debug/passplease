"use client";

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
  options: QuestionOption[];
}

export function QuestionCard({
  question,
  selectedOptionId,
  disabled,
  correctOptionId,
  onSelect,
  onSubmit,
}: {
  question: PracticeQuestion;
  selectedOptionId: string | null;
  disabled: boolean;
  correctOptionId: string | null;
  onSelect: (optionId: string) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <div className="mb-4 flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
        <span>
          {question.subjectName} · {question.topicName}
        </span>
        <span className="flex gap-2">
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
        {question.questionText}
      </p>

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
              <span className="text-neutral-800 dark:text-neutral-200">{option.text}</span>
            </button>
          );
        })}
      </div>

      {!disabled && (
        <button
          type="button"
          onClick={onSubmit}
          disabled={!selectedOptionId}
          className="mt-5 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40 dark:bg-neutral-100 dark:text-neutral-900"
        >
          Submit
        </button>
      )}
    </div>
  );
}
