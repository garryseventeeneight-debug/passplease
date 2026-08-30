import { createEmptyCard, fsrs, Rating, type Card } from "ts-fsrs";

const scheduler = fsrs();

export interface ReviewCardState {
  due: Date;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  reps: number;
  lapses: number;
  state: number;
  learningSteps: number;
  lastReview: Date | null;
}

function toCard(state: ReviewCardState | null): Card {
  if (!state) return createEmptyCard();
  return {
    due: state.due,
    stability: state.stability,
    difficulty: state.difficulty,
    elapsed_days: state.elapsedDays,
    scheduled_days: state.scheduledDays,
    reps: state.reps,
    lapses: state.lapses,
    state: state.state,
    learning_steps: state.learningSteps,
    last_review: state.lastReview ?? undefined,
  };
}

/**
 * Correct answers grade as FSRS "Good"; a wrong answer or "I don't know"
 * both grade as "Again" — no manual Hard/Easy self-rating step. FSRS's own
 * difficulty/lapse tracking already makes a question you've missed more
 * often come back sooner, which is the actual behaviour wanted here.
 */
export function nextReviewState(
  current: ReviewCardState | null,
  correct: boolean,
  now: Date = new Date()
): ReviewCardState {
  const card = toCard(current);
  const grade = correct ? Rating.Good : Rating.Again;
  const { card: next } = scheduler.next(card, now, grade);
  return {
    due: next.due,
    stability: next.stability,
    difficulty: next.difficulty,
    elapsedDays: next.elapsed_days,
    scheduledDays: next.scheduled_days,
    reps: next.reps,
    lapses: next.lapses,
    state: next.state,
    learningSteps: next.learning_steps,
    lastReview: next.last_review ?? null,
  };
}
