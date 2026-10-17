import { describe, expect, it } from "vitest";
import { checkOpenWeight } from "../../src/rules/openweight.js";
import { makeSnap } from "./helpers.js";

describe("checkOpenWeight", () => {
  it("passes when MODEL_CARD.md exists and README mentions Gemma 4", () => {
    const snap = makeSnap({
      fileTree: ["MODEL_CARD.md", "src/index.ts"],
      readme: "Powered by Gemma 4 open weights.",
    });
    const checks = checkOpenWeight(snap);
    expect(checks).toHaveLength(2);
    expect(checks[0].id).toBe("openweight.model_card");
    expect(checks[0].criterion).toBe("submission");
    expect(checks[0].pass).toBe(true);

    expect(checks[1].id).toBe("openweight.gemma_mention");
    expect(checks[1].criterion).toBe("submission");
    expect(checks[1].pass).toBe(true);
  });

  it("accepts gemma-4 with hyphen and different casing", () => {
    for (const mention of ["gemma-4", "GEMMA 4", "Gemma-4", "gemma 4"]) {
      const snap = makeSnap({
        fileTree: ["MODEL_CARD.md"],
        readme: `Using ${mention} as judge`,
      });
      const checks = checkOpenWeight(snap);
      expect(checks[1].pass).toBe(true);
    }
  });

  it("fails when MODEL_CARD.md is missing from fileTree", () => {
    const snap = makeSnap({
      fileTree: ["src/index.ts", "README.md"],
      readme: "Uses Gemma 4",
    });
    const checks = checkOpenWeight(snap);
    expect(checks[0].pass).toBe(false);
    expect(checks[1].pass).toBe(true);
  });

  it("fails when README does not mention Gemma 4", () => {
    const snap = makeSnap({
      fileTree: ["MODEL_CARD.md"],
      readme: "This is a generic README.",
    });
    const checks = checkOpenWeight(snap);
    expect(checks[0].pass).toBe(true);
    expect(checks[1].pass).toBe(false);
  });

  it("fails mention check when readme is null", () => {
    const snap = makeSnap({
      fileTree: ["MODEL_CARD.md"],
      readme: null,
    });
    const checks = checkOpenWeight(snap);
    expect(checks[0].pass).toBe(true);
    expect(checks[1].pass).toBe(false);
  });
});
