export interface SelectableQuestion {
  id: string;
  topicId: string;
}

const MIN_WEIGHT = 0.05;
const NEUTRAL_ACCURACY = 0.5;

/**
 * Weight a topic for selection: weaker topics (lower accuracy) get served
 * more often. Floored so a mastered topic still occasionally comes up.
 */
export function topicWeight(accuracy: number): number {
  return Math.max(MIN_WEIGHT, 1 - accuracy);
}

/**
 * Pick the next question, weighted toward questions in weaker topics.
 * `topicAccuracy` maps topicId -> accuracy (0-1); topics with no recorded
 * attempts should be omitted so they fall back to the neutral weight.
 */
export function pickNextQuestion<T extends SelectableQuestion>(
  questions: T[],
  topicAccuracy: Map<string, number>,
  options: { excludeId?: string; rng?: () => number } = {}
): T | null {
  if (questions.length === 0) return null;

  const pool =
    options.excludeId && questions.length > 1
      ? questions.filter((q) => q.id !== options.excludeId)
      : questions;

  const rng = options.rng ?? Math.random;
  const weights = pool.map((q) => topicWeight(topicAccuracy.get(q.topicId) ?? NEUTRAL_ACCURACY));
  const total = weights.reduce((a, b) => a + b, 0);

  let r = rng() * total;
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i];
    if (r <= 0) return pool[i];
  }
  return pool[pool.length - 1];
}

export interface ScaffoldCandidate {
  id: string;
  topicId: string;
  scaffoldOrder: number;
}

// Below this topic accuracy (including a topic with no attempts at all, which
// defaults to 0), the next question served is a small warm-up concept-check
// rather than the full past-paper question, so the learner never has to hold
// several unfamiliar concepts in mind at once.
const SCAFFOLD_ACCURACY_THRESHOLD = 0.6;

/**
 * Pick the earliest not-yet-cleared scaffold question for a topic the
 * learner is weak in or new to. Returns null once every weak topic's
 * scaffolds have already been answered correctly.
 */
export function pickScaffoldQuestion(
  scaffolds: ScaffoldCandidate[],
  topicAccuracy: Map<string, number>,
  clearedIds: Set<string>,
  options: { excludeId?: string } = {}
): ScaffoldCandidate | null {
  const pending = scaffolds
    .filter((s) => s.id !== options.excludeId)
    .filter((s) => !clearedIds.has(s.id))
    .filter((s) => (topicAccuracy.get(s.topicId) ?? 0) < SCAFFOLD_ACCURACY_THRESHOLD)
    .sort((a, b) => a.scaffoldOrder - b.scaffoldOrder);
  return pending[0] ?? null;
}
