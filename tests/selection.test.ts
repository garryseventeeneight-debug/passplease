import { describe, expect, it } from "vitest";
import { pickNextQuestion, topicWeight } from "@/lib/selection";

describe("topicWeight", () => {
  it("weights a topic with 0% accuracy at full weight", () => {
    expect(topicWeight(0)).toBe(1);
  });

  it("weights a mastered topic near the floor but never zero", () => {
    expect(topicWeight(1)).toBeGreaterThan(0);
    expect(topicWeight(1)).toBeLessThan(0.1);
  });

  it("weights linearly between the extremes", () => {
    expect(topicWeight(0.5)).toBeCloseTo(0.5);
  });
});

describe("pickNextQuestion", () => {
  const questions = [
    { id: "weak-1", topicId: "weak" },
    { id: "weak-2", topicId: "weak" },
    { id: "strong-1", topicId: "strong" },
    { id: "strong-2", topicId: "strong" },
  ];

  it("returns null for an empty question list", () => {
    expect(pickNextQuestion([], new Map())).toBeNull();
  });

  it("favours questions from a weaker topic over many draws", () => {
    const topicAccuracy = new Map([
      ["weak", 0.1],
      ["strong", 0.95],
    ]);

    let weakPicks = 0;
    const trials = 5000;
    for (let i = 0; i < trials; i++) {
      const picked = pickNextQuestion(questions, topicAccuracy, {
        rng: Math.random,
      });
      if (picked?.topicId === "weak") weakPicks += 1;
    }

    // weight(weak)=0.9, weight(strong)=0.05 -> weak should dominate heavily
    expect(weakPicks / trials).toBeGreaterThan(0.85);
  });

  it("excludes the given question id when other options exist", () => {
    const topicAccuracy = new Map<string, number>();
    for (let i = 0; i < 50; i++) {
      const picked = pickNextQuestion(questions, topicAccuracy, {
        excludeId: "weak-1",
        rng: Math.random,
      });
      expect(picked?.id).not.toBe("weak-1");
    }
  });

  it("falls back to the excluded question if it's the only one available", () => {
    const single = [{ id: "only", topicId: "t" }];
    const picked = pickNextQuestion(single, new Map(), { excludeId: "only" });
    expect(picked?.id).toBe("only");
  });

  it("is deterministic given a fixed rng", () => {
    const topicAccuracy = new Map([
      ["weak", 0.1],
      ["strong", 0.9],
    ]);
    const picked = pickNextQuestion(questions, topicAccuracy, { rng: () => 0 });
    expect(picked?.id).toBe("weak-1");
  });
});
