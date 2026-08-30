"use client";

import { useEffect, useState } from "react";
import { WikiText, type WikiLinkTarget } from "./WikiText";
import { LearnCheck } from "./LearnCheck";

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
  checkText: string | null;
  options: LearnOption[];
  completed: boolean;
}

export function LearnSession({ topicId }: { topicId: string }) {
  const [chunks, setChunks] = useState<LearnChunkData[] | null>(null);
  const [linkTargets, setLinkTargets] = useState<Record<string, WikiLinkTarget>>({});
  const [index, setIndex] = useState(0);
  const [reading, setReading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/learn/${topicId}`)
      .then((res) => res.json())
      .then((data: { chunks: LearnChunkData[]; linkTargets: Record<string, WikiLinkTarget> }) => {
        if (cancelled) return;
        setChunks(data.chunks);
        setLinkTargets(data.linkTargets);
        const firstIncomplete = data.chunks.findIndex((c) => !c.completed);
        setIndex(firstIncomplete === -1 ? 0 : firstIncomplete);
      });
    return () => {
      cancelled = true;
    };
  }, [topicId]);

  function goTo(nextIndex: number) {
    setIndex(nextIndex);
    setReading(true);
    setError(null);
  }

  function markComplete(chunkIndex: number) {
    setChunks((prev) =>
      prev ? prev.map((c, i) => (i === chunkIndex ? { ...c, completed: true } : c)) : prev
    );
  }

  async function skipCheckless() {
    if (!chunks) return;
    const chunk = chunks[index];
    const res = await fetch("/api/learn/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chunkId: chunk.id }),
    });
    if (!res.ok) {
      setError("Something went wrong recording that.");
      return;
    }
    markComplete(index);
    goTo(index + 1);
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
          <WikiText text={chunk.body} linkTargets={linkTargets} />
        </p>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        {reading && chunk.checkText && (
          <button
            type="button"
            onClick={() => setReading(false)}
            className="mt-5 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white dark:bg-neutral-100 dark:text-neutral-900"
          >
            Continue
          </button>
        )}

        {reading && !chunk.checkText && (
          <button
            type="button"
            onClick={skipCheckless}
            className="mt-5 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white dark:bg-neutral-100 dark:text-neutral-900"
          >
            {isLast ? "Finish" : "Continue"}
          </button>
        )}

        {!reading && chunk.checkText && (
          <div className="mt-5 border-t border-neutral-200 pt-5 dark:border-neutral-800">
            <LearnCheck
              key={chunk.id}
              chunkId={chunk.id}
              checkText={chunk.checkText}
              options={chunk.options}
              linkTargets={linkTargets}
              onComplete={() => markComplete(index)}
              afterFeedback={() =>
                !isLast ? (
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
                )
              }
            />
          </div>
        )}
      </div>
    </div>
  );
}
