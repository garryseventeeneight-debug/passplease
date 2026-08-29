export type MasteryLevel = "weak" | "developing" | "competent" | "strong" | "mastered";

export const MASTERY_LEVELS: { level: MasteryLevel; min: number; emoji: string; label: string }[] = [
  { level: "mastered", min: 95, emoji: "🔵", label: "Mastered" },
  { level: "strong", min: 85, emoji: "🟢", label: "Strong" },
  { level: "competent", min: 70, emoji: "🟡", label: "Competent" },
  { level: "developing", min: 50, emoji: "🟠", label: "Developing" },
  { level: "weak", min: 0, emoji: "🔴", label: "Weak" },
];

export function masteryLevelFor(score: number): (typeof MASTERY_LEVELS)[number] {
  return MASTERY_LEVELS.find((l) => score >= l.min) ?? MASTERY_LEVELS[MASTERY_LEVELS.length - 1];
}

const ROLLING_WINDOW = 20;

/**
 * Recent-window accuracy (0-100) from a list of attempts, most-recent-first.
 * Phase 1 only ever has MCQ evidence, so this is also the topic's mastery
 * score for now — once short-answer/extended-response scoring exists
 * (Phase 3), masteryScore should become a weighted blend instead of an alias.
 */
export function computeMcqScore(attemptsCorrectMostRecentFirst: boolean[]): number {
  if (attemptsCorrectMostRecentFirst.length === 0) return 0;
  const window = attemptsCorrectMostRecentFirst.slice(0, ROLLING_WINDOW);
  const correct = window.filter(Boolean).length;
  return (correct / window.length) * 100;
}
