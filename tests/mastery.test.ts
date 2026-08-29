import { describe, expect, it } from "vitest";
import { computeMcqScore, masteryLevelFor } from "@/lib/mastery";

describe("computeMcqScore", () => {
  it("returns 0 for no attempts", () => {
    expect(computeMcqScore([])).toBe(0);
  });

  it("returns 100 for all-correct attempts", () => {
    expect(computeMcqScore([true, true, true])).toBe(100);
  });

  it("returns 0 for all-incorrect attempts", () => {
    expect(computeMcqScore([false, false])).toBe(0);
  });

  it("computes percentage correct", () => {
    expect(computeMcqScore([true, false, true, false])).toBe(50);
  });

  it("only considers the most recent 20 attempts", () => {
    const oldWrong = Array(30).fill(false);
    const recentRight = Array(20).fill(true);
    expect(computeMcqScore([...recentRight, ...oldWrong])).toBe(100);
  });
});

describe("masteryLevelFor", () => {
  it.each([
    [0, "weak"],
    [49, "weak"],
    [50, "developing"],
    [69, "developing"],
    [70, "competent"],
    [84, "competent"],
    [85, "strong"],
    [94, "strong"],
    [95, "mastered"],
    [100, "mastered"],
  ])("scores %d as %s", (score, expected) => {
    expect(masteryLevelFor(score).level).toBe(expected);
  });
});
