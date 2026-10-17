import { z } from "zod";
import { RepoSnapshot, RuleCheck } from "../schema.js";
import { checkLicense } from "./license.js";
import { checkReadme } from "./readme.js";
import { checkCI } from "./ci.js";
import { checkCommits } from "./commits.js";
import { checkContributors } from "./contributors.js";
import { checkCoc } from "./coc.js";
import { checkSecrets } from "./secrets.js";
import { checkOpenWeight } from "./openweight.js";

export function runRules(snap: RepoSnapshot): RuleCheck[] {
  const checks: RuleCheck[] = [
    ...checkLicense(snap),
    ...checkReadme(snap),
    ...checkCI(snap),
    ...checkCommits(snap),
    ...checkContributors(snap),
    ...checkCoc(snap),
    ...checkSecrets(snap),
    ...checkOpenWeight(snap),
  ];

  return z.array(RuleCheck).parse(checks);
}

export {
  checkLicense,
  checkReadme,
  checkCI,
  checkCommits,
  checkContributors,
  checkCoc,
  checkSecrets,
  checkOpenWeight,
};
