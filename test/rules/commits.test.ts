import { describe, expect, it } from "vitest";
import { checkCommits } from "../../src/rules/commits.js";
import { makeSnap } from "./helpers.js";

describe("checkCommits", () => {
  it("passes when commitCount is greater than 15", () => {
    const snap = makeSnap({ commitCount: 25 });
    const checks = checkCommits(snap);
    expect(checks).toHaveLength(1);
    expect(checks[0].id).toBe("commits.count");
    expect(checks[0].criterion).toBe("substantial_work");
    expect(checks[0].pass).toBe(true);
    expect(checks[0].evidence).toContain("25");
  });

  it("passes when commitCount is exactly 15", () => {
    const snap = makeSnap({ commitCount: 15 });
    const checks = checkCommits(snap);
    expect(checks[0].pass).toBe(true);
    expect(checks[0].evidence).toContain("15");
  });

  it("fails when commitCount is less than 15", () => {
    const snap = makeSnap({ commitCount: 14 });
    const checks = checkCommits(snap);
    expect(checks[0].pass).toBe(false);
    expect(checks[0].evidence).toContain("14");
  });

  it("fails when commitCount is 0", () => {
    const snap = makeSnap({ commitCount: 0 });
    const checks = checkCommits(snap);
    expect(checks[0].pass).toBe(false);
    expect(checks[0].evidence).toContain("0");
  });
});
