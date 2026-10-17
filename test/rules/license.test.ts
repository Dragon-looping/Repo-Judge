import { describe, expect, it } from "vitest";
import { checkLicense } from "../../src/rules/license.js";
import { makeSnap } from "./helpers.js";

describe("checkLicense", () => {
  it("passes for valid OSI-approved licenses", () => {
    for (const lic of [
      "MIT",
      "Apache-2.0",
      "BSD-2-Clause",
      "BSD-3-Clause",
      "GPL-2.0",
      "GPL-3.0",
      "LGPL-2.1",
      "LGPL-3.0-only",
      "MPL-2.0",
      "ISC",
      "AGPL-3.0",
      "Unlicense",
    ]) {
      const snap = makeSnap({ license: lic });
      const checks = checkLicense(snap);
      expect(checks).toHaveLength(1);
      expect(checks[0].id).toBe("license.osi_approved");
      expect(checks[0].criterion).toBe("easy_to_verify");
      expect(checks[0].pass).toBe(true);
      expect(checks[0].evidence).toContain(lic);
    }
  });

  it("fails when license is null", () => {
    const snap = makeSnap({ license: null });
    const checks = checkLicense(snap);
    expect(checks).toHaveLength(1);
    expect(checks[0].pass).toBe(false);
    expect(checks[0].evidence.toLowerCase()).toContain("no license");
  });

  it("fails for NOASSERTION and OTHER", () => {
    for (const lic of ["NOASSERTION", "OTHER"]) {
      const snap = makeSnap({ license: lic });
      const checks = checkLicense(snap);
      expect(checks[0].pass).toBe(false);
      expect(checks[0].evidence).toContain("not an OSI-approved");
    }
  });

  it("fails for unrecognized proprietary license", () => {
    const snap = makeSnap({ license: "PROPRIETARY-1.0" });
    const checks = checkLicense(snap);
    expect(checks[0].pass).toBe(false);
  });
});
