import { describe, expect, it } from "vitest";
import { computeStreak } from "@/lib/streak";

const DAY = 24 * 60 * 60 * 1000;

describe("computeStreak", () => {
  const now = new Date("2026-08-29T12:00:00Z");

  it("returns 0 with no attempts", () => {
    expect(computeStreak([], now)).toBe(0);
  });

  it("counts a single day practising today", () => {
    expect(computeStreak([now], now)).toBe(1);
  });

  it("counts consecutive days ending today", () => {
    const dates = [now, new Date(now.getTime() - DAY), new Date(now.getTime() - 2 * DAY)];
    expect(computeStreak(dates, now)).toBe(3);
  });

  it("still counts the streak if today hasn't been practised yet but yesterday was", () => {
    const dates = [new Date(now.getTime() - DAY), new Date(now.getTime() - 2 * DAY)];
    expect(computeStreak(dates, now)).toBe(2);
  });

  it("resets to 0 if there's a gap before yesterday", () => {
    const dates = [new Date(now.getTime() - 3 * DAY)];
    expect(computeStreak(dates, now)).toBe(0);
  });

  it("stops counting at a gap", () => {
    const dates = [now, new Date(now.getTime() - DAY), new Date(now.getTime() - 3 * DAY)];
    expect(computeStreak(dates, now)).toBe(2);
  });
});
