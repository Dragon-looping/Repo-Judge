# Model Card — RepoJudge AI Judge

## Model Overview

| Field | Value |
|-------|-------|
| Model family | Gemma 4 |
| Open-weight | Yes |
| Hosting endpoint | Gemini API (Google) |
| Closed model used | **No** |
| Fallback model | **None** |
| Model id env var | `GEMMA_MODEL` (set by operator) |

---

## What "open-weight via Gemini API" means

Gemma 4 is an open-weight model published by Google DeepMind under the Gemma Terms of Use. RepoJudge accesses it through the Gemini API's model-serving infrastructure — the same weights, a managed endpoint. **No proprietary or closed model is used at any point, including as a fallback.** If `GEMMA_MODEL` is not set or the API is unavailable, the server will not silently substitute another model; it will return an error.

---

## Intended Use

RepoJudge uses Gemma 4 to score public GitHub repositories against six hackathon judging criteria:

| Criterion | Description |
|-----------|-------------|
| `clear_problem` | Does the project clearly state the problem it solves? |
| `substantial_work` | Does the codebase show meaningful implementation effort? |
| `easy_to_verify` | Can a judge reproduce or demo the project easily? |
| `demo_explanation` | Is there a demo, video, or clear explanation? |
| `collaboration` | Does the commit history show distributed team work? |
| `submission` | Are all required submission artefacts present? |

Each criterion receives a score 0–5 with reasoning text and up to 5 evidence file references.

---

## What Data Is Processed

- **Public GitHub repository data only**: README, file tree, contributor list, commit count, CI config presence, license, code of conduct presence.
- **No private repository data** is ever requested or stored.
- **No user personal data** beyond the GitHub login names already visible on public repos.

---

## Limitations

- Scores are **advisory only**. Gemma 4 can misread context, miss implicit evidence, or hallucinate file references. Human review remains the authoritative decision.
- The model has a fixed context window. Very large READMEs or file trees are truncated before prompting.
- Scores may vary slightly between runs due to model temperature settings.
- The model is not fine-tuned on hackathon judging rubrics; it applies general code-comprehension capability.

---

## Prompt-Injection Defenses

User-controlled strings (README content, file names, contributor logins) are potential injection vectors. RepoJudge applies the following defenses before any string reaches the model prompt:

1. **Structural separation** — repo data is placed in a clearly delimited `<repo_data>` block; instructions are outside it.
2. **Length caps** — README is truncated to a maximum character limit; file tree is capped to a maximum number of entries.
3. **Evidence sanitisation** — rule-engine evidence strings are stripped of control characters before inclusion.
4. **No system-prompt leakage** — the system prompt does not contain secrets; `GEMINI_API_KEY` and `GITHUB_TOKEN` are never sent to the model.

Despite these measures, prompt injection is an inherent risk of processing untrusted text. Scores from repos that contain adversarial content should be reviewed manually.

---

## Responsible Use

- Do not use RepoJudge as the sole deciding mechanism for prize allocation without human review.
- Do not process private repositories; the ingest layer is restricted to public repos only.
- Respect the [MLH Code of Conduct](https://github.com/MLH/mlh-policies/blob/main/code-of-conduct.md) when using or extending this tool.

---

## Model License

Gemma 4 is subject to the [Gemma Terms of Use](https://ai.google.dev/gemma/terms). RepoJudge itself is MIT-licensed (see [LICENSE](LICENSE)).
