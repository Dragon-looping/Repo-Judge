import { describe, expect, it } from "vitest";
import { runRules } from "../../src/rules/index.js";
import { RuleCheck } from "../../src/schema.js";
import { makeSnap } from "./helpers.js";

describe("runRules", () => {
  it("runs all rule checks in fixed order and validates against RuleCheck schema", () => {
    const snap = makeSnap();
    const results = runRules(snap);

    expect(results.length).toBeGreaterThan(0);

    // Schema validation
    for (const check of results) {
      expect(() => RuleCheck.parse(check)).not.toThrow();
    }

    // Verify ordering
    const prefixes = results.map((r) => r.id.split(".")[0]);
    const expectedPrefixOrder = [
      "license",
      "readme",
      "ci",
      "commits",
      "contributors",
      "coc",
      "secrets",
      "openweight",
    ];

    const uniquePrefixesInOrder: string[] = [];
    for (const p of prefixes) {
      if (!uniquePrefixesInOrder.includes(p)) {
        uniquePrefixesInOrder.push(p);
      }
    }

    expect(uniquePrefixesInOrder).toEqual(expectedPrefixOrder);
  });
});
