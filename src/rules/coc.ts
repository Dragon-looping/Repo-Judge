import { RepoSnapshot, RuleCheck } from "../schema.js";

export function checkCoc(snap: RepoSnapshot): RuleCheck[] {
  return [
    {
      id: "coc.code_of_conduct",
      criterion: "submission",
      pass: snap.hasCodeOfConduct,
      evidence: snap.hasCodeOfConduct
        ? "Code of Conduct found in repository"
        : "No Code of Conduct found in repository",
    },
    {
      id: "coc.links_mlh",
      criterion: "submission",
      pass: snap.linksMlhCoc,
      evidence: snap.linksMlhCoc
        ? "Link to MLH Code of Conduct found"
        : "No link to MLH Code of Conduct found",
    },
  ];
}
