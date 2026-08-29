function toDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Consecutive-day streak ending today (or yesterday, so a streak doesn't
 * reset to 0 just because today's practice hasn't happened yet).
 * `attemptDates` need not be sorted or deduplicated.
 */
export function computeStreak(attemptDates: Date[], now: Date = new Date()): number {
  const days = new Set(attemptDates.map(toDayKey));
  if (days.size === 0) return 0;

  const cursor = new Date(now);
  if (!days.has(toDayKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!days.has(toDayKey(cursor))) return 0;
  }

  let streak = 0;
  while (days.has(toDayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
