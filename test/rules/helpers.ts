import { RepoSnapshot } from "../../src/schema.js";

export function makeSnap(overrides: Partial<RepoSnapshot> = {}): RepoSnapshot {
  return {
    url: "https://github.com/test-org/test-repo",
    owner: "test-org",
    name: "test-repo",
    isPublic: true,
    license: "MIT",
    readme: `# Test Repo

## Overview
What it does and the problem it solves.

## Setup
Installation and usage instructions: npm run start.

## Demo
Screenshots and demo video available here.

## Team
Authors and contributors: Alice, Bob, and Charlie.

Powered by Gemma 4.
`,
    fileTree: [
      "src/index.ts",
      "test/index.test.ts",
      "README.md",
      "MODEL_CARD.md",
      ".github/workflows/ci.yml",
    ],
    commitCount: 20,
    contributors: [
      { login: "alice", commits: 10 },
      { login: "bob", commits: 6 },
      { login: "charlie", commits: 4 },
    ],
    hasCI: true,
    hasTests: true,
    hasCodeOfConduct: true,
    linksMlhCoc: true,
    fetchedAt: "2026-10-17T11:00:00.000Z",
    ...overrides,
  };
}
