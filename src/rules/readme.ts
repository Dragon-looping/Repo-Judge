import { RepoSnapshot, RuleCheck } from "../schema.js";

const PROBLEM_HEADING_REGEX = /\b(problem|overview|what[- ]it[- ]does)\b/i;
const SETUP_HEADING_REGEX = /\b(setup|install|installation|run|running|usage|getting[- ]started)\b/i;
const DEMO_HEADING_REGEX = /\b(demo|screenshot|screenshots|video|videos)\b/i;
const TEAM_HEADING_REGEX = /\b(team|contributor|contributors|author|authors)\b/i;

function hasHeading(content: string, pattern: RegExp): boolean {
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (/^#{1,6}\s+/.test(trimmed)) {
      const headingText = trimmed.replace(/^#{1,6}\s+/, "").trim();
      if (pattern.test(headingText)) {
        return true;
      }
    }
  }
  return false;
}

export function checkReadme(snap: RepoSnapshot): RuleCheck[] {
  if (snap.readme === null) {
    return [
      {
        id: "readme.exists",
        criterion: "clear_problem",
        pass: false,
        evidence: "README missing",
      },
      {
        id: "readme.problem",
        criterion: "clear_problem",
        pass: false,
        evidence: "README missing",
      },
      {
        id: "readme.setup",
        criterion: "easy_to_verify",
        pass: false,
        evidence: "README missing",
      },
      {
        id: "readme.demo",
        criterion: "demo_explanation",
        pass: false,
        evidence: "README missing",
      },
      {
        id: "readme.team",
        criterion: "collaboration",
        pass: false,
        evidence: "README missing",
      },
    ];
  }

  const hasProblem = hasHeading(snap.readme, PROBLEM_HEADING_REGEX);
  const hasSetup = hasHeading(snap.readme, SETUP_HEADING_REGEX);
  const hasDemo = hasHeading(snap.readme, DEMO_HEADING_REGEX);
  const hasTeam = hasHeading(snap.readme, TEAM_HEADING_REGEX);

  return [
    {
      id: "readme.exists",
      criterion: "clear_problem",
      pass: true,
      evidence: "README file found in repository",
    },
    {
      id: "readme.problem",
      criterion: "clear_problem",
      pass: hasProblem,
      evidence: hasProblem
        ? "Problem/overview heading found in README"
        : "No problem/overview/what-it-does heading found in README",
    },
    {
      id: "readme.setup",
      criterion: "easy_to_verify",
      pass: hasSetup,
      evidence: hasSetup
        ? "Setup/install/run/usage heading found in README"
        : "No setup/install/run/usage heading found in README",
    },
    {
      id: "readme.demo",
      criterion: "demo_explanation",
      pass: hasDemo,
      evidence: hasDemo
        ? "Demo/screenshot/video heading found in README"
        : "No demo/screenshot/video heading found in README",
    },
    {
      id: "readme.team",
      criterion: "collaboration",
      pass: hasTeam,
      evidence: hasTeam
        ? "Team/contributors/authors heading found in README"
        : "No team/contributors/authors heading found in README",
    },
  ];
}
