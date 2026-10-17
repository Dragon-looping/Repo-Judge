import { RepoSnapshot, RuleCheck } from "../schema.js";

const OSI_APPROVED_IDS = new Set([
  "MIT",
  "Apache-2.0",
  "BSD-2-Clause",
  "BSD-3-Clause",
  "GPL-2.0",
  "GPL-2.0-only",
  "GPL-2.0-or-later",
  "GPL-3.0",
  "GPL-3.0-only",
  "GPL-3.0-or-later",
  "MPL-2.0",
  "ISC",
  "AGPL-3.0",
  "AGPL-3.0-only",
  "AGPL-3.0-or-later",
  "Unlicense",
]);

function isOsiApproved(license: string): boolean {
  if (license === "NOASSERTION" || license === "OTHER") {
    return false;
  }
  if (OSI_APPROVED_IDS.has(license)) {
    return true;
  }
  if (license.startsWith("LGPL-")) {
    return true;
  }
  return false;
}

export function checkLicense(snap: RepoSnapshot): RuleCheck[] {
  if (!snap.license) {
    return [
      {
        id: "license.osi_approved",
        criterion: "easy_to_verify",
        pass: false,
        evidence: "No license found in repository",
      },
    ];
  }

  const pass = isOsiApproved(snap.license);
  return [
    {
      id: "license.osi_approved",
      criterion: "easy_to_verify",
      pass,
      evidence: pass
        ? `OSI-approved license found: ${snap.license}`
        : `License "${snap.license}" is not an OSI-approved SPDX identifier`,
    },
  ];
}
