"use client";

import { useState } from "react";
import { MathText } from "./MathText";

const LETTERS = ["A", "B", "C", "D", "E", "F"];

export interface QuestionDetailData {
  id: string;
  questionText: string;
  explanation: string | null;
  source: string;
  sourceUrl: string | null;
  sourceYear: number | null;
  sourcePaper: string | null;
  difficulty: number;
  subjectName: string;
  topicName: string;
  subtopicName: string | null;
  isAiGenerated: boolean;
  answerVerified: boolean;
  imageData: string | null;
  flaggedWrong: boolean;
  flagNote: string | null;
  options: { id: string; text: string; isCorrect: boolean }[];
}

export function QuestionDetail({ question }: { question: QuestionDetailData }) {
  const [flaggedWrong, setFlaggedWrong] = useState(question.flaggedWrong);
  const [flagNote, setFlagNote] = useState(question.flagNote ?? "");
  const [editingNote, setEditingNote] = useState(false);
  const [saving, setSaving] = useState(false);

  async function saveFlag(next: { flaggedWrong?: boolean; flagNote?: string | null }) {
    setSaving(true);
    const res = await fetch(`/api/questions/${question.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    });
    setSaving(false);
    if (res.ok) {
      const data = await res.json();
      setFlaggedWrong(data.flaggedWrong);
      setFlagNote(data.flagNote ?? "");
    }
  }

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
        <span>
          {question.subjectName} · {question.topicName}
          {question.subtopicName ? ` · ${question.subtopicName}` : ""}
        </span>
        {question.isAiGenerated && (
          <span className="rounded bg-purple-100 px-2 py-0.5 font-medium text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
            AI-generated
          </span>
        )}
        {!question.answerVerified && (
          <span className="rounded bg-amber-100 px-2 py-0.5 font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
            AI-solved answer
          </span>
        )}
        {flaggedWrong && (
          <span className="rounded bg-red-100 px-2 py-0.5 font-medium text-red-700 dark:bg-red-900/40 dark:text-red-300">
            Flagged wrong
          </span>
        )}
      </div>

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
          <div
            key={option.id}
            className={[
              "flex items-start gap-3 rounded-md border px-4 py-3 text-left text-sm",
              option.isCorrect
                ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                : "border-neutral-200 dark:border-neutral-700",
            ].join(" ")}
          >
            <span className="font-semibold text-neutral-500 dark:text-neutral-400">{LETTERS[i]}</span>
            <span className="text-neutral-800 dark:text-neutral-200">
              <MathText text={option.text} />
            </span>
            {option.isCorrect && (
              <span className="ml-auto shrink-0 text-xs font-medium text-green-700 dark:text-green-400">
                Correct
              </span>
            )}
          </div>
        ))}
      </div>

      {question.explanation && (
        <p className="mt-4 text-sm text-neutral-700 dark:text-neutral-300">
          <MathText text={question.explanation} />
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-xs text-neutral-500 dark:text-neutral-400">
        <span>Source: {question.source}</span>
        {question.sourceYear && <span>Year: {question.sourceYear}</span>}
        {question.sourcePaper && <span>{question.sourcePaper}</span>}
        <span>Difficulty: {question.difficulty}/5</span>
      </div>

      <div className="mt-6 border-t border-neutral-200 pt-4 dark:border-neutral-800">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Evaluate this question
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {!flaggedWrong ? (
            <button
              type="button"
              disabled={saving}
              onClick={() => saveFlag({ flaggedWrong: true })}
              className="rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-40 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              ⚠ Flag as wrong
            </button>
          ) : (
            <button
              type="button"
              disabled={saving}
              onClick={() => saveFlag({ flaggedWrong: false, flagNote: null })}
              className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-600 hover:bg-neutral-50 disabled:opacity-40 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              ✓ Unflag
            </button>
          )}
          <button
            type="button"
            onClick={() => setEditingNote((v) => !v)}
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            {flagNote ? "Edit note" : "Add note"}
          </button>
        </div>
        {editingNote && (
          <div className="mt-3 flex flex-col gap-2">
            <textarea
              value={flagNote}
              onChange={(e) => setFlagNote(e.target.value)}
              placeholder="What's wrong with this question?"
              rows={2}
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            />
            <button
              type="button"
              disabled={saving}
              onClick={async () => {
                await saveFlag({ flagNote, flaggedWrong: true });
                setEditingNote(false);
              }}
              className="self-start rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40 dark:bg-neutral-100 dark:text-neutral-900"
            >
              Save note
            </button>
          </div>
        )}
        {!editingNote && flagNote && (
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">Note: {flagNote}</p>
        )}
      </div>
    </div>
  );
}
