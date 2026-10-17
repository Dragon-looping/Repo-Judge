import { describe, expect, it } from "vitest";
import { checkCoc } from "../../src/rules/coc.js";
import { makeSnap } from "./helpers.js";

describe("checkCoc", () => {
  it("passes when code of conduct and MLH link are present", () => {
    const snap = makeSnap({ hasCodeOfConduct: true, linksMlhCoc: true });
    const checks = checkCoc(snap);
    expect(checks).toHaveLength(2);
    expect(checks[0].id).toBe("coc.code_of_conduct");
    expect(checks[0].criterion).toBe("submission");
    expect(checks[0].pass).toBe(true);

    expect(checks[1].id).toBe("coc.links_mlh");
    expect(checks[1].criterion).toBe("submission");
    expect(checks[1].pass).toBe(true);
  });

  it("fails when Code of Conduct is missing", () => {
    const snap = makeSnap({ hasCodeOfConduct: false, linksMlhCoc: true });
    const checks = checkCoc(snap);
    expect(checks[0].pass).toBe(false);
    expect(checks[1].pass).toBe(true);
  });

  it("fails when MLH link is missing", () => {
    const snap = makeSnap({ hasCodeOfConduct: true, linksMlhCoc: false });
    const checks = checkCoc(snap);
    expect(checks[0].pass).toBe(true);
    expect(checks[1].pass).toBe(false);
  });
});
