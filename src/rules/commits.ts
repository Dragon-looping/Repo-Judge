import { RepoSnapshot, RuleCheck } from "../schema.js";

export function checkCommits(snap: RepoSnapshot): RuleCheck[] {
  const pass = snap.commitCount >= 15;
  return [
    {
      id: "commits.count",
      criterion: "substantial_work",
      pass,
      evidence: pass
        ? `Found ${snap.commitCount} commits (meets minimum 15 required)`
        : `Found only ${snap.commitCount} commits (minimum 15 required)`,
    },
  ];
}
