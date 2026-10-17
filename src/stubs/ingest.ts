/**
 * src/stubs/ingest.ts
 *
 * Stub for src/ingest/github.ts (Person 1's module).
 * Returns deterministic, schema-valid RepoSnapshot data derived from the URL.
 * NO network calls, NO randomness.
 *
 * XSS fixture: when the repo name equals "xss-fixture" (URL ends in /xss-fixture/demo
 * or /xss-fixture/demo.git) this stub injects hostile strings into evidence fields
 * to prove the UI renders them safely. Clearly labelled below.
 *
 * Real module signature expected:
 *   export async function buildSnapshot(url: string): Promise<RepoSnapshot>
 */

import { RepoSnapshot } from "../schema.js";

const XSS_FIXTURE_REPO = "xss-fixture";

export async function buildSnapshot(url: string): Promise<RepoSnapshot> {
  // Derive owner/name from URL (already validated by server before this call)
  const parsed = new URL(url);
  const [, owner, repoRaw] = parsed.pathname.split("/");
  const name = (repoRaw ?? "repo").replace(/\.git$/, "");

  const isXssFixture = name === XSS_FIXTURE_REPO;

  // XSS fixture: hostile strings deliberately planted to prove safe rendering.
  // Only active when repo name === "xss-fixture" (clearly-labelled local demo).
  const hostileEvidence = isXssFixture
    ? '<img src=x onerror=alert(1)> <script>alert(1)</script>'
    : undefined;

  const snap: RepoSnapshot = {
    url: `https://github.com/${owner}/${name}`,
    owner: owner ?? "stub-owner",
    name,
    isPublic: true,
    license: isXssFixture ? hostileEvidence! : "MIT",
    readme: isXssFixture
      ? hostileEvidence!
      : `# ${name}\n\nThis is stub README content for demonstration purposes.`,
    fileTree: [
      "README.md",
      "LICENSE",
      ".github/workflows/ci.yml",
      "src/index.ts",
      "test/index.test.ts",
      isXssFixture ? hostileEvidence! : "package.json",
    ],
    commitCount: 42,
    contributors: [
      { login: "contributor-a", commits: 28 },
      { login: "contributor-b", commits: 14 },
    ],
    hasCI: true,
    hasTests: true,
    hasCodeOfConduct: false,  // deliberately false so one rule fails
    linksMlhCoc: false,
    fetchedAt: new Date().toISOString(),
  };

  // Validate with real schema before returning
  return RepoSnapshot.parse(snap);
}
