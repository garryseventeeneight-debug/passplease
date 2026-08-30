"use client";

import { useEffect, useState } from "react";
import { MathText } from "./MathText";

interface LearnOption {
  id: string;
  text: string;
}

interface LearnChunkData {
  id: string;
  order: number;
  subtopicName: string | null;
  heading: string;
  body: string;
  checkText: string;
  options: LearnOption[];
  completed: boolean;
}

type Phase = "reading" | "checking" | "feedback";

export function LearnSession({ topicId }: { topicId: string }) {
  const [chunks, setChunks] = useState<LearnChunkData[] | null>(null);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("reading");
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ correct: boolean; correctOptionId: string | null } | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/learn/${topicId}`)
      .then((res) => res.json())
      .then((data: { chunks: LearnChunkData[] }) => {
        if (cancelled) return;
        setChunks(data.chunks);
        const firstIncomplete = data.chunks.findIndex((c) => !c.completed);
        setIndex(firstIncomplete === -1 ? 0 : firstIncomplete);
      });
    return () => {
      cancelled = true;
    };
  }, [topicId]);

  function goTo(nextIndex: number) {
    setIndex(nextIndex);
    setPhase("reading");
    setSelectedOptionId(null);
    setFeedback(null);
    setError(null);
  }

  async function submitCheck() {
    if (!chunks || !selectedOptionId) return;
    const chunk = chunks[index];
    const res = await fetch("/api/learn/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chunkId: chunk.id, optionId: selectedOptionId }),
    });
    if (!res.ok) {
      setError("Something went wrong recording that.");
      return;
    }
    const data = await res.json();
    setFeedback({ correct: data.correct, correctOptionId: data.correctOptionId });
    setPhase("feedback");
    setChunks((prev) =>
      prev ? prev.map((c, i) => (i === index ? { ...c, completed: true } : c)) : prev
    );
  }

  if (chunks === null) {
    return <p className="text-sm text-neutral-500">Loading…</p>;
  }
  if (chunks.length === 0) {
    return <p className="text-sm text-neutral-500">No reading content for this topic yet.</p>;
  }

  const chunk = chunks[index];
  const isLast = index === chunks.length - 1;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-1.5">
        {chunks.map((c, i) => (
          <button
            key={c.id}
            type="button"
            onClick={() => goTo(i)}
            title={c.heading}
            className={[
              "h-2 flex-1 min-w-[16px] rounded-full transition-colors",
              i === index
                ? "bg-neutral-900 dark:bg-neutral-100"
                : c.completed
                  ? "bg-green-400 dark:bg-green-700"
                  : "bg-neutral-200 dark:bg-neutral-800",
            ].join(" ")}
          />
        ))}
      </div>
      <p className="text-xs text-neutral-500 dark:text-neutral-400">
        {chunk.subtopicName ? `${chunk.subtopicName} · ` : ""}
        Chunk {index + 1} of {chunks.length}
      </p>

      <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="mb-3 text-lg font-medium text-neutral-900 dark:text-neutral-100">
          {chunk.heading}
        </h2>
        <p className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
          <MathText text={chunk.body} />
        </p>

        {phase === "reading" && (
          <button
            type="button"
            onClick={() => setPhase("checking")}
            className="mt-5 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white dark:bg-neutral-100 dark:text-neutral-900"
          >
            Continue
          </button>
        )}

        {phase !== "reading" && (
          <div className="mt-5 border-t border-neutral-200 pt-5 dark:border-neutral-800">
            <p className="mb-3 text-sm font-medium text-neutral-800 dark:text-neutral-200">
              <MathText text={chunk.checkText} />
            </p>
            <div className="flex flex-col gap-2">
              {chunk.options.map((option) => {
                const isSelected = selectedOptionId === option.id;
                const isCorrect = feedback && feedback.correctOptionId === option.id;
                const isWrongSelected = feedback && isSelected && !isCorrect;
                return (
                  <button
                    key={option.id}
                    type="button"
                    disabled={phase === "feedback"}
                    onClick={() => phase === "checking" && setSelectedOptionId(option.id)}
                    className={[
                      "rounded-md border px-4 py-2.5 text-left text-sm transition-colors",
                      isCorrect
                        ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                        : isWrongSelected
                          ? "border-red-500 bg-red-50 dark:bg-red-900/20"
                          : isSelected
                            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                            : "border-neutral-200 hover:border-neutral-400 dark:border-neutral-700 dark:hover:border-neutral-500",
                      phase === "feedback" ? "cursor-default" : "cursor-pointer",
                    ].join(" ")}
                  >
                    <MathText text={option.text} />
                  </button>
                );
              })}
            </div>

            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

            {phase === "checking" && (
              <button
                type="button"
                onClick={submitCheck}
                disabled={!selectedOptionId}
                className="mt-4 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40 dark:bg-neutral-100 dark:text-neutral-900"
              >
                Submit
              </button>
            )}

            {phase === "feedback" && feedback && (
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
                {!isLast ? (
                  <button
                    type="button"
                    onClick={() => goTo(index + 1)}
                    className="mt-3 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white dark:bg-neutral-100 dark:text-neutral-900"
                  >
                    Next
                  </button>
                ) : (
                  <p className="mt-3 text-sm text-neutral-500 dark:text-neutral-400">
                    That&apos;s every chunk for this topic — jump back to any of them above, or
                    head back to the dashboard.
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
