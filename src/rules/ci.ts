import { RepoSnapshot, RuleCheck } from "../schema.js";

export function checkCI(snap: RepoSnapshot): RuleCheck[] {
  return [
    {
      id: "ci.has_ci",
      criterion: "easy_to_verify",
      pass: snap.hasCI,
      evidence: snap.hasCI ? "CI workflow configured" : "No CI workflow found",
    },
    {
      id: "ci.has_tests",
      criterion: "substantial_work",
      pass: snap.hasTests,
      evidence: snap.hasTests ? "Test suite detected" : "No test suite detected",
    },
  ];
}
