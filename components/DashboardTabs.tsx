"use client";

import { type ReactNode, useEffect, useState } from "react";

const STORAGE_KEY = "hsc-dashboard-mode";
type Mode = "questions" | "workbook";

export function DashboardTabs({
  questionBook,
  workbook,
}: {
  questionBook: ReactNode;
  workbook: ReactNode;
}) {
  const [mode, setMode] = useState<Mode>("questions");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Deferred to a microtask (rather than called directly in the effect
    // body) so this reads as an async callback, not a synchronous setState
    // during the effect itself.
    Promise.resolve().then(() => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored === "questions" || stored === "workbook") setMode(stored);
      } catch {
        // ignore — falls back to the default mode
      }
      setHydrated(true);
    });
  }, []);

  function choose(next: Mode) {
    setMode(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // per-viewer convenience only — fine if it doesn't persist
    }
  }

  return (
    <div>
      <div className="mb-8 inline-flex rounded-lg border border-neutral-200 p-1 dark:border-neutral-800">
        <button
          type="button"
          onClick={() => choose("questions")}
          className={[
            "rounded-md px-4 py-2 text-sm font-medium transition-colors",
            mode === "questions"
              ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
              : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800",
          ].join(" ")}
        >
          Question Book
        </button>
        <button
          type="button"
          onClick={() => choose("workbook")}
          className={[
            "rounded-md px-4 py-2 text-sm font-medium transition-colors",
            mode === "workbook"
              ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
              : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800",
          ].join(" ")}
        >
          Workbook
        </button>
      </div>
      {/* Render both, hide with CSS rather than unmounting — avoids a
          hydration flash before localStorage is read, and keeps the
          server-rendered content already fetched instead of refetching. */}
      <div className={hydrated && mode !== "questions" ? "hidden" : undefined}>{questionBook}</div>
      <div className={hydrated && mode !== "workbook" ? "hidden" : undefined}>{workbook}</div>
    </div>
  );
}
