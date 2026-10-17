# RepoJudge Presentation & Demonstration Guide

This document provides the complete live demo walkthrough, technical script, Q&A responses, and team roles for presenting **RepoJudge** at the hackathon.

---

## 1. Before You Present: Setup Checklist

Follow these steps prior to demoing on projector or recording:

1. **Verify Environment Variables (`.env`)**:
   Ensure `.env` contains valid credentials for live evaluation:
   ```env
   GITHUB_TOKEN=ghp_...
   GEMINI_API_KEY=...    # Used solely as the Gemma 4 host endpoint; never for Gemini models
   GEMMA_MODEL=gemma-4-it
   ```
2. **Wire Real Modules**:
   In `src/server.ts`, confirm the wiring block is configured for live operation:
   ```typescript
   // ---- MODULE WIRING: swap stubs for real modules here (one line per import) ----
   import { buildSnapshot } from "./ingest/github.js";   // was: "./stubs/ingest.js"
   import { runRules }      from "./rules/index.js";     // was: "./stubs/rules.js"
   import { judge }         from "./judge/gemma.js";     // was: "./stubs/judge.js"
   import { mergeScorecard } from "./merge.js";           // was: "./stubs/merge.js"
   // -------------------------------------------------------------------------------
   const USING_STUBS = false; // flip to false when live modules are wired
   ```
3. **Verify Health Endpoint**:
   Check health status in terminal:
   ```powershell
   Invoke-RestMethod -Uri http://localhost:3000/api/health
   ```
   Confirm response returns:
   ```json
   { "status": "ok", "dataSource": "live", "time": "..." }
   ```
   *(Note: If running in demo/offline mode with stubs, `dataSource` will report `"stub"` and the UI will honestly display the synthetic demo banner).*
4. **Start the Application**:
   ```powershell
   npm run dev
   ```
   Navigate to `http://localhost:3000`.

---

## 2. Five-Minute Live Demo Script

| Timestamp | Phase & Focus | Action & Interface Interaction | Spoken Narration & Key Points |
| :--- | :--- | :--- | :--- |
| **0:00 – 0:30** | **Hook & The Problem** | Show the Hero view on `localhost:3000`. Point to the 3D orbital repository visualization and headline. | *"Hackathon judges review dozens of repositories under severe time constraints. Manual repo inspection is inconsistent: judges miss missing licenses, uncommitted code, broken CI, or unverified claims. RepoJudge brings automated rigor to hackathon evaluation by combining deterministic checks with Gemma 4 open-weight AI analysis."* |
| **0:30 – 1:30** | **Rules Only Mode** | Click the **"Try: github/gitignore"** sample button. Ensure **"Rules Only"** radio option is selected. Click **"Analyze Repository"**. | *"Let's first run 'Rules Only' mode. Notice the instant response time. In this mode, no AI model is ever invoked. We run 12 deterministic checks across 6 criteria: README structure, commit velocity, license validity, CI workflow existence, and repository hygiene. Every check produces an auditable pass/fail verdict and concrete evidence."* |
| **1:30 – 2:45** | **Rules + Gemma 4 Mode** | Click **"← Analyze another repository"**. Select **"Rules + Gemma 4"** mode. Click **"Analyze Repository"**. Point to the loading view and skeleton cards. | *"Now we select 'Rules + Gemma 4'. Notice our honest loading screen: we explain exactly what the pipeline is doing rather than showing fake progress percentages. Gemma 4 evaluates qualitative aspects that static rules cannot detect: problem clarity, architectural depth, and verification ease. Each criterion receives a 0–5 score with full reasoning and specific recommendations."* |
| **2:45 – 3:30** | **Prompt-Injection Defense** | Click **"Try: xss-fixture/demo"** (clearly labelled local demo fixture). Submit the form. | *"Repositories contain hostile, untrusted content—including READMEs and commit messages designed to trigger prompt injection or XSS. Watch our handling of this hostile fixture: script tags and image error triggers (`<img onerror=...>`) are completely neutralized. In our architecture, untrusted repository content is strictly isolated within delimiters and rendered via textContent."* |
| **3:30 – 4:15** | **Architecture Walkthrough** | Expand evidence panels (`<details>`). Point out the summary bar and copy button. | *"Our architectural philosophy is simple: AI verdicts are advisory; deterministic rules are verifiable. If Gemma fails to score a criterion, the UI explicitly flags it as 'Not scored' and refuses to invent a total score. We also provide a one-click plain-text summary export for judges' deliberation logs."* |
| **4:15 – 5:00** | **Close & Model Card** | Scroll to footer. Highlight: *'Judge model: Gemma 4 (open-weight). No closed models used.'* Click **Model card** link. | *"RepoJudge relies exclusively on Gemma 4 open weights. No closed, proprietary models or hidden fallbacks are used. Evaluators can inspect our Model Card and replicate every evaluation independently. Thank you!"* |

### Fallback Plan: If Live API is Slow or Rate Limited
- **If GitHub Rate Limits Trigger (HTTP 429)**: The UI displays the server's exact `Retry-After` hint. Explain: *"The GitHub API enforces strict per-IP rate limits; RepoJudge maps this to a 429 status with Retry-After headers."*
- **If Gemma Inference Times Out**: The server enforces a configurable 60s timeout returning HTTP 504. Switch to **Rules Only** mode to demonstrate instantaneous deterministic analysis.
- **Offline / Stub Mode**: If Wi-Fi fails, demo using the built-in stub modules (`USING_STUBS = true`). The top banner will prominently and honestly declare: *"Demo data: stub modules active — not a live evaluation."*

---

## 3. Three-Minute Technical Q&A

### Q1: Why Gemma 4 instead of closed proprietary models?
**Answer**: Hackathon evaluation requires transparency and reproducibility. Proprietary closed-source models can change versions, alter scoring distributions, or deprecate without notice. Gemma 4 provides state-of-the-art open weights with verifiable evaluation parameters, allowing institutions and hackathons to host their own evaluation nodes without vendor lock-in.

### Q2: Why combine deterministic rules with AI judgments?
**Answer**: Rules and LLMs solve complementary problems. Deterministic rules excel at verifiable facts: Does `LICENSE` exist? Did the GitHub Actions workflow pass? Are there at least 5 commits? AI excels at subjective synthesis: Is the problem clearly articulated? Is the architectural design substantial? By separating verifiable facts from qualitative assessment, judges can trust the baseline while benefiting from advisory AI analysis.

### Q3: How is prompt injection and hostile repository content handled?
**Answer**: 
1. **Frontend Defense**: Zero HTML-injection sinks exist in `public/app.js`. All dynamic repository text, AI reasoning, and evidence strings are rendered strictly via `document.createTextNode` and `textContent`.
2. **Pipeline Sanitization**: *(Design specification to verify after teammate merge)*: Repository content is capped in token size and wrapped inside isolated `<repo_content>` XML fences before passing to Gemma. Instructions in the model prompt explicitly tell the judge to ignore instructions embedded inside the repository files.

### Q4: How can judges verify the results independently?
**Answer**: 
1. **Rules Only Mode**: Anyone can run `mode="rules"` with zero API keys or external dependencies.
2. **Deterministic Evidence**: Every rule output includes the exact file path, commit count, or string match evidence.
3. **Automated Vitest Suite**: 31 server and client test cases run in under 2 seconds (`npm test`), validating scoring logic and API safety.

### Q5: What happens when a criterion is unscored?
**Answer**: When Gemma leaves a criterion unscored, the UI renders an explicit amber badge and warning message: *"Not scored — this criterion was not returned by the model."* Crucially, the overall `Total` score is displayed as **unavailable** rather than fabricating an artificial average or denominator.

### Q6: What would you improve next?
**Answer**:
1. **Streaming / SSE Ingestion**: Add server-sent events to stream rule completion and model tokens in real-time.
2. **Diff Inspection**: Analyze pull request commit diffs directly to evaluate commit distribution across teammates over the hackathon duration.
3. **Custom Rubrics**: Allow hackathon organizers to upload custom rule YAML definitions and weighted rubrics.

---

## 4. Team Roles & Contributions

| Role | Responsibilities | Assigned Engineer |
| :--- | :--- | :--- |
| **Person 1 — Lead / Ingest & Docs** | GitHub API Octokit integration, repository snapshot extraction, tree walker, rate limit mapping, project documentation. | `TODO: [Person 1 Name]` |
| **Person 2 — Rules Engine & CI** | Deterministic check engine, rule predicates, evidence extraction, GitHub Actions CI workflows. | `TODO: [Person 2 Name]` |
| **Person 3 — Gemma 4 Judge** | Gemma 4 integration via Google GenAI SDK, system prompt engineering, prompt-injection isolation, structured verdict output. | `TODO: [Person 3 Name]` |
| **Person 4 — UI, Server & Demo** | Express server architecture (`src/server.ts`), schema-valid stubs (`src/stubs/`), responsive accessible UI (`public/`), test suite (`test/server/`), demo guide (`demo/DEMO.md`). | `TODO: [Person 4 Name]` |
