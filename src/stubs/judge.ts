/**
 * src/stubs/judge.ts
 *
 * Stub for src/judge/gemma.ts (Person 3's module).
 * Returns deterministic, schema-valid GemmaVerdict[] derived from a RepoSnapshot.
 * NO GEMMA_MODEL read, NO network calls, NO randomness.
 * Covers 5 of 6 criteria; "submission" is left out to populate `unscored`,
 * exercising the "Not scored / total unavailable" UI state.
 *
 * Real module signature expected:
 *   export async function judge(snap: RepoSnapshot): Promise<{ verdicts: GemmaVerdict[]; unscored: CriterionId[] }>
 */

import { GemmaVerdict, RepoSnapshot, CriterionId } from "../schema.js";

export async function judge(
  snap: RepoSnapshot
): Promise<{ verdicts: GemmaVerdict[]; unscored: CriterionId[] }> {
  const isXssFixture = snap.name === "xss-fixture";

  // XSS fixture: hostile strings in reasoning/evidence/suggestion to prove safe rendering.
  const xss = "<img src=x onerror=alert(1)> <script>alert(1)</script>";

  const verdicts: GemmaVerdict[] = [
    {
      criterion: "clear_problem",
      score: 4,
      reasoning: isXssFixture
        ? xss
        : "The repository includes a README with a clear problem statement and project scope. " +
          "The description is accessible to evaluators unfamiliar with the domain. " +
          "Minor improvement: a dedicated 'Problem Statement' heading would help.",
      evidence: isXssFixture
        ? [xss, xss]
        : [
            "README.md present with project description",
            "Problem context is evident in the opening sections",
          ],
      suggestion: isXssFixture
        ? xss
        : "Add a dedicated 'Problem Statement' section to README for faster evaluator scanning.",
    },
    {
      criterion: "substantial_work",
      score: 3,
      reasoning: isXssFixture
        ? xss
        : "Evidence of meaningful development effort: multiple contributors and commits. " +
          "The file tree indicates a structured project. " +
          "The commit history suggests active development within the hackathon window.",
      evidence: isXssFixture
        ? [xss]
        : [
            `${snap.commitCount} commits recorded`,
            `${snap.contributors.length} contributors: ${snap.contributors.map((c) => c.login).join(", ")}`,
            "Structured file tree with source and test directories",
          ],
      suggestion: isXssFixture
        ? xss
        : "Include commit timestamps in the README to confirm hackathon-window work.",
    },
    {
      criterion: "easy_to_verify",
      score: 4,
      reasoning: isXssFixture
        ? xss
        : "Repository is public with a permissive license. " +
          "Evaluators can clone and run locally. " +
          "License and public visibility are both confirmed.",
      evidence: isXssFixture
        ? [xss, xss]
        : [
            snap.license ? `License: ${snap.license}` : "No license",
            snap.isPublic ? "Repository is public" : "Repository is private",
          ],
      suggestion: isXssFixture
        ? xss
        : "Add setup instructions (e.g., npm install, npm run dev) to the README.",
    },
    {
      criterion: "demo_explanation",
      score: 3,
      reasoning: isXssFixture
        ? xss
        : "CI pipeline is present, indicating reproducible builds. " +
          "Test files exist but test coverage details are not visible from metadata alone. " +
          "A demo link or video would significantly strengthen this criterion.",
      evidence: isXssFixture
        ? [xss, xss, xss]
        : [
            snap.hasCI ? "CI workflow present" : "No CI",
            snap.hasTests ? "Test files found" : "No tests",
            "No demo link or video URL found in metadata",
          ],
      suggestion: isXssFixture
        ? xss
        : "Add a DEMO.md or a demo video link in README under a 'Demo' heading.",
    },
    {
      criterion: "collaboration",
      score: 2,
      reasoning: isXssFixture
        ? xss
        : "Multiple contributors are present. " +
          "However, no Code of Conduct file or MLH CoC link was found. " +
          "This is a common oversight in hackathon projects but reduces the score.",
      evidence: isXssFixture
        ? [xss]
        : [
            `${snap.contributors.length} contributors`,
            "No CODE_OF_CONDUCT.md",
            "No link to MLH Code of Conduct",
          ],
      suggestion: isXssFixture
        ? xss
        : "Add CODE_OF_CONDUCT.md or link to https://mlh.io/code-of-conduct.",
    },
    // 'submission' criterion is intentionally omitted -> goes to `unscored`
    // This exercises the "Not scored / total unavailable" UI state.
  ];

  const unscored: CriterionId[] = ["submission"];

  return {
    verdicts: verdicts.map((v) => GemmaVerdict.parse(v)),
    unscored,
  };
}
