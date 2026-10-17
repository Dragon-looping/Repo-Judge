import { describe, expect, it } from "vitest";
import { checkContributors } from "../../src/rules/contributors.js";
import { makeSnap } from "./helpers.js";

describe("checkContributors", () => {
  it("passes when >= 3 contributors have >= 1 commit and top contributor has <= 70%", () => {
    const snap = makeSnap({
      contributors: [
        { login: "alice", commits: 50 },
        { login: "bob", commits: 30 },
        { login: "charlie", commits: 20 },
      ],
    });
    const checks = checkContributors(snap);
    expect(checks).toHaveLength(2);
    expect(checks.every((c) => c.pass)).toBe(true);
    expect(checks.every((c) => c.criterion === "collaboration")).toBe(true);
  });

  it("passes when top contributor has exactly 70% of commits", () => {
    const snap = makeSnap({
      contributors: [
        { login: "alice", commits: 70 },
        { login: "bob", commits: 15 },
        { login: "charlie", commits: 15 },
      ],
    });
    const checks = checkContributors(snap);
    const distCheck = checks.find((c) => c.id === "contributors.distribution");
    expect(distCheck?.pass).toBe(true);
    expect(distCheck?.evidence).toContain("70.0%");
  });

  it("fails distribution when top contributor has more than 70%", () => {
    const snap = makeSnap({
      contributors: [
        { login: "alice", commits: 71 },
        { login: "bob", commits: 15 },
        { login: "charlie", commits: 14 },
      ],
    });
    const checks = checkContributors(snap);
    const countCheck = checks.find((c) => c.id === "contributors.count");
    const distCheck = checks.find((c) => c.id === "contributors.distribution");
    expect(countCheck?.pass).toBe(true);
    expect(distCheck?.pass).toBe(false);
    expect(distCheck?.evidence).toContain("exceeds 70%");
  });

  it("fails when there is only one contributor with 100%", () => {
    const snap = makeSnap({
      contributors: [{ login: "solo", commits: 100 }],
    });
    const checks = checkContributors(snap);
    expect(checks[0].pass).toBe(false);
    expect(checks[1].pass).toBe(false);
  });

  it("fails when contributors array is empty (guards division by zero)", () => {
    const snap = makeSnap({
      contributors: [],
    });
    const checks = checkContributors(snap);
    expect(checks[0].pass).toBe(false);
    expect(checks[1].pass).toBe(false);
    expect(checks[1].evidence).toContain("Total contributor commits is 0");
  });

  it("does not count contributors with 0 commits towards minimum 3 requirement", () => {
    const snap = makeSnap({
      contributors: [
        { login: "alice", commits: 10 },
        { login: "bob", commits: 5 },
        { login: "ghost", commits: 0 },
      ],
    });
    const checks = checkContributors(snap);
    const countCheck = checks.find((c) => c.id === "contributors.count");
    expect(countCheck?.pass).toBe(false);
  });
});
