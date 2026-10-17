import { RepoSnapshot, RuleCheck } from "../schema.js";

export function checkContributors(snap: RepoSnapshot): RuleCheck[] {
  const validContributors = snap.contributors.filter((c) => c.commits >= 1);
  const countPass = validContributors.length >= 3;

  const totalCommits = snap.contributors.reduce((acc, c) => acc + c.commits, 0);
  let distributionPass = false;
  let distributionEvidence = "";

  if (totalCommits === 0) {
    distributionPass = false;
    distributionEvidence = "Total contributor commits is 0; cannot verify distribution";
  } else {
    const maxCommits = Math.max(...snap.contributors.map((c) => c.commits));
    const maxShare = maxCommits / totalCommits;
    distributionPass = maxShare <= 0.7;
    const maxPercent = (maxShare * 100).toFixed(1);
    distributionEvidence = distributionPass
      ? `Top contributor has ${maxPercent}% of commits (within 70% limit)`
      : `Top contributor has ${maxPercent}% of commits (exceeds 70% limit)`;
  }

  return [
    {
      id: "contributors.count",
      criterion: "collaboration",
      pass: countPass,
      evidence: countPass
        ? `Found ${validContributors.length} contributors with >= 1 commit (meets minimum 3)`
        : `Found ${validContributors.length} contributor(s) with >= 1 commit (minimum 3 required)`,
    },
    {
      id: "contributors.distribution",
      criterion: "collaboration",
      pass: distributionPass,
      evidence: distributionEvidence,
    },
  ];
}
