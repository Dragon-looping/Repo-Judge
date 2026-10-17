/**
 * src/stubs/rules.ts
 *
 * Stub for src/rules/index.ts (Person 2's module).
 * Returns deterministic, schema-valid RuleCheck[] derived from a RepoSnapshot.
 * Covers all 6 criteria. Includes at least one failing rule.
 *
 * Real module signature expected:
 *   export function runRules(snap: RepoSnapshot): RuleCheck[]
 */

import { RuleCheck, RepoSnapshot } from "../schema.js";

export function runRules(snap: RepoSnapshot): RuleCheck[] {
  const isXssFixture = snap.name === "xss-fixture";

  // XSS fixture: hostile evidence strings to prove safe UI rendering.
  // Only active for the clearly-labelled local demo fixture.
  const xssEvidence = isXssFixture
    ? '<img src=x onerror=alert(1)> <script>alert(1)</script>'
    : null;

  const checks: RuleCheck[] = [
    // ── clear_problem ──────────────────────────────────────────────────
    {
      id: "has_readme",
      criterion: "clear_problem",
      pass: snap.readme !== null && snap.readme.length > 50,
      evidence: xssEvidence
        ?? (snap.readme
          ? `README present (${snap.readme.length} chars)`
          : "No README found"),
    },
    {
      id: "readme_describes_problem",
      criterion: "clear_problem",
      pass: snap.readme !== null && snap.readme.toLowerCase().includes("#"),
      evidence: xssEvidence
        ?? (snap.readme ? "README has headings" : "README missing or empty"),
    },

    // ── substantial_work ───────────────────────────────────────────────
    {
      id: "has_commits",
      criterion: "substantial_work",
      pass: snap.commitCount >= 5,
      evidence: xssEvidence ?? `${snap.commitCount} commits found`,
    },
    {
      id: "has_multiple_contributors",
      criterion: "substantial_work",
      pass: snap.contributors.length >= 2,
      evidence: xssEvidence
        ?? `${snap.contributors.length} contributor(s): ${snap.contributors.map((c) => c.login).join(", ")}`,
    },

    // ── easy_to_verify ─────────────────────────────────────────────────
    {
      id: "has_license",
      criterion: "easy_to_verify",
      pass: snap.license !== null,
      evidence: xssEvidence
        ?? (snap.license ? `License: ${snap.license}` : "No license file found"),
    },
    {
      id: "is_public",
      criterion: "easy_to_verify",
      pass: snap.isPublic,
      evidence: xssEvidence ?? (snap.isPublic ? "Repository is public" : "Repository is private"),
    },

    // ── demo_explanation ───────────────────────────────────────────────
    {
      id: "has_ci",
      criterion: "demo_explanation",
      pass: snap.hasCI,
      evidence: xssEvidence
        ?? (snap.hasCI ? "CI workflow found (.github/workflows/)" : "No CI workflow found"),
    },
    {
      id: "has_tests",
      criterion: "demo_explanation",
      pass: snap.hasTests,
      evidence: xssEvidence ?? (snap.hasTests ? "Test files detected in tree" : "No test files found"),
    },

    // ── collaboration ──────────────────────────────────────────────────
    {
      id: "has_code_of_conduct",
      criterion: "collaboration",
      // Deliberately failing rule so UI can demonstrate the fail state
      pass: snap.hasCodeOfConduct,
      evidence: xssEvidence
        ?? (snap.hasCodeOfConduct ? "CODE_OF_CONDUCT.md found" : "No CODE_OF_CONDUCT.md (failing rule for demo)"),
    },
    {
      id: "links_mlh_coc",
      criterion: "collaboration",
      pass: snap.linksMlhCoc,
      evidence: xssEvidence
        ?? (snap.linksMlhCoc ? "Links to MLH Code of Conduct" : "Does not link MLH Code of Conduct"),
    },

    // ── submission ─────────────────────────────────────────────────────
    {
      id: "has_file_tree",
      criterion: "submission",
      pass: snap.fileTree.length > 0,
      evidence: xssEvidence ?? `${snap.fileTree.length} files in tree`,
    },
    {
      id: "repo_is_accessible",
      criterion: "submission",
      pass: snap.isPublic,
      evidence: xssEvidence ?? (snap.isPublic ? "Repository accessible without auth" : "Repository requires auth"),
    },
  ];

  // Validate each item with real schema
  return checks.map((c) => RuleCheck.parse(c));
}
