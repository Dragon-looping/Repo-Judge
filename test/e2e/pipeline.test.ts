// TODO: switch to loadFixture() once feat/ingest is merged
import { describe, expect, it } from "vitest";
import { mergeScorecard } from "../../src/merge.js";
import { runRules } from "../../src/rules/index.js";
import { CriterionId, GemmaVerdict, Scorecard } from "../../src/schema.js";
import { bareSnapshot, goodSnapshot, injectionSnapshot } from "./snapshots.js";

describe("E2E Rules Pipeline", () => {
  const fixtures = [
    { name: "good", snapshot: goodSnapshot },
    { name: "bare", snapshot: bareSnapshot },
    { name: "injection", snapshot: injectionSnapshot },
  ];

  it.each(fixtures)("runs pipeline for $name fixture in rules mode", ({ snapshot }) => {
    const rules = runRules(snapshot);
    const scorecard = mergeScorecard(snapshot, rules, [], "rules");

    // Parses with Scorecard zod schema
    expect(() => Scorecard.parse(scorecard)).not.toThrow();

    // Mode is "rules", verdicts is [], unscored is [], model is null
    expect(scorecard.mode).toBe("rules");
    expect(scorecard.verdicts).toEqual([]);
    expect(scorecard.unscored).toEqual([]);
    expect(scorecard.model).toBeNull();

    // Total is a number between 0 and 30
    expect(typeof scorecard.total).toBe("number");
    expect(scorecard.total).toBeGreaterThanOrEqual(0);
    expect(scorecard.total).toBeLessThanOrEqual(30);
  });

  it("good fixture has a higher total than the bare fixture", () => {
    const goodRules = runRules(goodSnapshot);
    const goodScorecard = mergeScorecard(goodSnapshot, goodRules, [], "rules");

    const bareRules = runRules(bareSnapshot);
    const bareScorecard = mergeScorecard(bareSnapshot, bareRules, [], "rules");

    expect(goodScorecard.total).not.toBeNull();
    expect(bareScorecard.total).not.toBeNull();
    expect(goodScorecard.total!).toBeGreaterThan(bareScorecard.total!);
  });

  it("does not reflect injected instructions in rule evidence", () => {
    const injectionRules = runRules(injectionSnapshot);
    for (const rule of injectionRules) {
      expect(rule.evidence.toLowerCase()).not.toContain("ignore previous instructions");
    }
  });

  it("rules+gemma mode with 5 of 6 verdicts gives total null, missing criterion in unscored, and valid model", () => {
    const rules = runRules(goodSnapshot);
    const allCriteria = CriterionId.options;
    const missingCriterion = allCriteria[allCriteria.length - 1]; // "submission"
    const partialCriteria = allCriteria.slice(0, 5);

    const fiveVerdicts: GemmaVerdict[] = partialCriteria.map((criterion) => ({
      criterion,
      score: 5,
      reasoning: "Looks great.",
      evidence: ["README.md"],
      suggestion: "No improvements needed.",
    }));

    const scorecard = mergeScorecard(goodSnapshot, rules, fiveVerdicts, "rules+gemma", [], "gemma-test");

    expect(() => Scorecard.parse(scorecard)).not.toThrow();
    expect(scorecard.mode).toBe("rules+gemma");
    expect(scorecard.total).toBeNull();
    expect(scorecard.unscored).toContain(missingCriterion);
    expect(scorecard.model).not.toBeNull();
    expect(typeof scorecard.model?.name).toBe("string");
    expect(typeof scorecard.model?.servedBy).toBe("string");
    expect(scorecard.model?.servedBy).toBe("gemma-test");
    expect(scorecard.model?.openWeight).toBe(true);
  });
});
