import { describe, expect, it } from "vitest";
import { checkCI } from "../../src/rules/ci.js";
import { makeSnap } from "./helpers.js";

describe("checkCI", () => {
  it("passes when hasCI and hasTests are true", () => {
    const snap = makeSnap({ hasCI: true, hasTests: true });
    const checks = checkCI(snap);
    expect(checks).toHaveLength(2);
    expect(checks[0].id).toBe("ci.has_ci");
    expect(checks[0].criterion).toBe("easy_to_verify");
    expect(checks[0].pass).toBe(true);
    expect(checks[1].id).toBe("ci.has_tests");
    expect(checks[1].criterion).toBe("substantial_work");
    expect(checks[1].pass).toBe(true);
  });

  it("fails when hasCI is false", () => {
    const snap = makeSnap({ hasCI: false, hasTests: true });
    const checks = checkCI(snap);
    expect(checks[0].pass).toBe(false);
    expect(checks[1].pass).toBe(true);
  });

  it("fails when hasTests is false", () => {
    const snap = makeSnap({ hasCI: true, hasTests: false });
    const checks = checkCI(snap);
    expect(checks[0].pass).toBe(true);
    expect(checks[1].pass).toBe(false);
  });
});
