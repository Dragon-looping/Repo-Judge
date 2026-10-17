import { describe, expect, it } from "vitest";
import { checkReadme } from "../../src/rules/readme.js";
import { makeSnap } from "./helpers.js";

describe("checkReadme", () => {
  it("passes all checks when all sections are present", () => {
    const snap = makeSnap();
    const checks = checkReadme(snap);
    expect(checks).toHaveLength(5);
    expect(checks.every((c) => c.pass)).toBe(true);

    const ids = checks.map((c) => c.id);
    expect(ids).toEqual([
      "readme.exists",
      "readme.problem",
      "readme.setup",
      "readme.demo",
      "readme.team",
    ]);

    expect(checks.find((c) => c.id === "readme.exists")?.criterion).toBe("clear_problem");
    expect(checks.find((c) => c.id === "readme.problem")?.criterion).toBe("clear_problem");
    expect(checks.find((c) => c.id === "readme.setup")?.criterion).toBe("easy_to_verify");
    expect(checks.find((c) => c.id === "readme.demo")?.criterion).toBe("demo_explanation");
    expect(checks.find((c) => c.id === "readme.team")?.criterion).toBe("collaboration");
  });

  it("fails all checks with exact evidence when readme is null", () => {
    const snap = makeSnap({ readme: null });
    const checks = checkReadme(snap);
    expect(checks).toHaveLength(5);
    for (const check of checks) {
      expect(check.pass).toBe(false);
      expect(check.evidence).toBe("README missing");
    }
  });

  it("handles case-insensitivity and markdown header levels", () => {
    const customReadme = `
# WHAT IT DOES
Solving big problems.
### InStAlLaTiOn
run npm i.
## Screenshots
Look at these.
#### Contributors
By Team Rocket.
`;
    const snap = makeSnap({ readme: customReadme });
    const checks = checkReadme(snap);
    expect(checks.every((c) => c.pass)).toBe(true);
  });

  it("fails individual section checks when headings are absent", () => {
    const snap = makeSnap({ readme: "# Just a title\nNo other headings." });
    const checks = checkReadme(snap);
    expect(checks.find((c) => c.id === "readme.exists")?.pass).toBe(true);
    expect(checks.find((c) => c.id === "readme.problem")?.pass).toBe(false);
    expect(checks.find((c) => c.id === "readme.setup")?.pass).toBe(false);
    expect(checks.find((c) => c.id === "readme.demo")?.pass).toBe(false);
    expect(checks.find((c) => c.id === "readme.team")?.pass).toBe(false);
  });
});
