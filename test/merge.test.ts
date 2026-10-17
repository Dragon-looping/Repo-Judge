import { describe, expect, it } from "vitest";
import { mergeScorecard, rulesScore } from "../src/merge.js";
import { runRules } from "../src/rules/index.js";
import { CriterionId, GemmaVerdict, RuleCheck, Scorecard } from "../src/schema.js";
import { makeSnap } from "./rules/helpers.js";

describe("rulesScore", () => {
  it("calculates scores scaled to 5 rounded to 1 decimal place", () => {
    const rules: RuleCheck[] = [
      { id: "c1.1", criterion: "clear_problem", pass: true, evidence: "ok" },
      { id: "c1.2", criterion: "clear_problem", pass: false, evidence: "fail" },
      { id: "c2.1", criterion: "substantial_work", pass: true, evidence: "ok" },
    ];

    const scores = rulesScore(rules);
    // clear_problem: (1 / 2) * 5 = 2.5
    expect(scores.clear_problem).toBe(2.5);
    // substantial_work: (1 / 1) * 5 = 5.0
    expect(scores.substantial_work).toBe(5);
    // criteria with zero checks get no rule score
    expect(scores.easy_to_verify).toBeUndefined();
  });
});

describe("mergeScorecard", () => {
  const snap = makeSnap();
  const rules = runRules(snap);

  const fullVerdicts: GemmaVerdict[] = CriterionId.options.map((criterion) => ({
    criterion,
    score: 4,
    reasoning: "Solid implementation with clear evidence.",
    evidence: ["README.md", "src/rules/index.ts"],
    suggestion: "Keep up the good work.",
  }));

  it("handles mode 'rules' with model null, empty verdicts, empty unscored, and numeric total", () => {
    const scorecard = mergeScorecard(snap, rules, fullVerdicts, "rules");

    expect(scorecard.mode).toBe("rules");
    expect(scorecard.repo).toBe(`${snap.owner}/${snap.name}`);
    expect(scorecard.model).toBeNull();
    expect(scorecard.verdicts).toEqual([]);
    expect(scorecard.unscored).toEqual([]);
    expect(typeof scorecard.total).toBe("number");
    expect(scorecard.total).toBeGreaterThan(0);
    expect(scorecard.total).toBeLessThanOrEqual(30);

    expect(() => Scorecard.parse(scorecard)).not.toThrow();
  });

  it("handles mode 'rules+gemma' with missing verdict: unscored populated, total is null", () => {
    // Exclude one criterion from verdicts
    const partialVerdicts = fullVerdicts.filter((v) => v.criterion !== "submission");

    const scorecard = mergeScorecard(
      snap,
      rules,
      partialVerdicts,
      "rules+gemma",
      ["clear_problem"]
    );

    expect(scorecard.mode).toBe("rules+gemma");
    expect(scorecard.total).toBeNull();
    expect(scorecard.unscored).toContain("submission");
    expect(scorecard.unscored).toContain("clear_problem");
    expect(scorecard.model).toEqual({
      name: process.env.GEMMA_MODEL ?? "unknown",
      servedBy: "Gemini API",
      openWeight: true,
    });

    expect(() => Scorecard.parse(scorecard)).not.toThrow();
  });

  it("handles mode 'rules+gemma' with complete verdicts: calculates combined numeric total", () => {
    const prevModel = process.env.GEMMA_MODEL;
    const prevServedBy = process.env.GEMMA_SERVED_BY;
    process.env.GEMMA_MODEL = "gemma-4-test";
    delete process.env.GEMMA_SERVED_BY;

    try {
      const scorecard = mergeScorecard(snap, rules, fullVerdicts, "rules+gemma");

      expect(scorecard.mode).toBe("rules+gemma");
      expect(scorecard.unscored).toEqual([]);
      expect(typeof scorecard.total).toBe("number");
      expect(scorecard.total).toBeGreaterThan(0);
      expect(scorecard.model).toEqual({
        name: "gemma-4-test",
        servedBy: "Gemini API",
        openWeight: true,
      });

      expect(() => Scorecard.parse(scorecard)).not.toThrow();
    } finally {
      process.env.GEMMA_MODEL = prevModel;
      if (prevServedBy !== undefined) {
        process.env.GEMMA_SERVED_BY = prevServedBy;
      } else {
        delete process.env.GEMMA_SERVED_BY;
      }
    }
  });
});
