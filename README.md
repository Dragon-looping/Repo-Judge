# RepoJudge

An automated hackathon repository judge that scores public GitHub repos against structured criteria using a deterministic rules engine, optionally augmented by **Gemma 4** as an open-weight AI judge.

---

## Problem Statement

Hackathon organizers must manually review dozens (sometimes hundreds) of submitted repositories in a short window. Scoring is inconsistent, slow, and hard to audit. RepoJudge solves this by running every repo through a transparent, reproducible pipeline that produces a structured `Scorecard` JSON — readable by humans and machines alike.

---

## Features

- **Deterministic rules engine** — checks licenses, CI/CD, tests, README quality, contributors, commit activity, CoC compliance, and more. No model needed.
- **Gemma 4 AI judge** — optional second pass; each criterion gets a 0–5 score with reasoning and evidence from the open-weight Gemma 4 model.
- **Rules-only vs Rules+Gemma toggle** — every endpoint accepts a `mode` parameter:
  - `rules` — fast, free, fully deterministic; Gemma is never called.
  - `rules+gemma` — rules run first, then Gemma 4 scores each criterion; final total is averaged.
- **Structured output** — every run produces a `Scorecard` object validated by Zod; safe to store, diff, or feed to a UI.
- **Prompt-injection defenses** — all user-controlled strings (README, file names) are sanitised before reaching the model prompt.
- **No closed models, no fallback** — only Gemma 4 via the Gemini API hosting endpoint. See [`MODEL_CARD.md`](MODEL_CARD.md).

---

## Architecture

```
GitHub Repo URL
      │
      ▼
┌─────────────┐
│   Ingest    │  GitHub REST API → RepoSnapshot (owner, README, fileTree,
│  (Octokit)  │  contributors, CI, license, CoC flags …)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Rules     │  Deterministic checks → RuleCheck[]
│   Engine    │  (license, commits, contributors, CI, README, secrets …)
└──────┬──────┘
       │   mode = "rules" ──────────────────────────────┐
       │   mode = "rules+gemma"                          │
       ▼                                                 │
┌─────────────┐                                          │
│  Gemma 4    │  One structured prompt per criterion     │
│   Judge     │  → GemmaVerdict[] (score 0-5 + reasoning)│
└──────┬──────┘                                          │
       │                                                 │
       ▼                                                 ▼
┌─────────────────────────────────────────────────────────┐
│                    Merge / Scorecard                    │
│  Combines rule scores + Gemma scores → total (0-30)    │
│  Validates with Zod → Scorecard JSON                   │
└──────────────────────────┬──────────────────────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │   Express    │
                    │  REST API /  │
                    │  HTML UI     │
                    └──────────────┘
```

---

## Setup

### Prerequisites

- Node.js 20+
- A GitHub personal access token (public repo read scope)
- A Gemini API key (only needed for `rules+gemma` mode)

### Install

```bash
git clone https://github.com/Dragon-looping/Repo-Judge.git
cd Repo-Judge
npm install
```

### Configure

```bash
cp .env.example .env
# Edit .env and fill in your values:
#   GITHUB_TOKEN=ghp_...
#   GEMINI_API_KEY=AIza...
#   GEMMA_MODEL=gemma-4-...   # exact model id from Gemini API
```

> **.env is git-ignored.** Never commit real credentials.

---

## Run

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with hot-reload via tsx |
| `npm run build` | Compile TypeScript → `dist/` |
| `npm start` | Run compiled server from `dist/` |
| `npm test` | Run vitest test suite |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 20, TypeScript (strict) |
| Web server | Express 5 |
| GitHub API | @octokit/rest |
| AI judge | Gemma 4 via @google/genai (Gemini API hosting) |
| Schema / validation | Zod |
| Testing | Vitest |

---

## Team Roles

| Person | Role |
|--------|------|
| Member 1 | Ingest & GitHub API integration |
| Member 2 | Rules engine & scoring logic |
| Member 3 | Gemma 4 judge integration & prompt design |
| Member 4 | REST API, UI, merge/scorecard, CI |

---

## Code of Conduct

This project follows the [MLH Code of Conduct](https://github.com/MLH/mlh-policies/blob/main/code-of-conduct.md). All contributors are expected to uphold it.

---

## Model

See [`MODEL_CARD.md`](MODEL_CARD.md) for full details on the Gemma 4 model used as judge.

---

## License

[MIT](LICENSE)