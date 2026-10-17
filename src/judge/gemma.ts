import { GoogleGenAI } from "@google/genai";
import {
  CriterionId,
  GemmaVerdict,
  type RepoSnapshot,
} from "../schema.js";
import {
  CRITERIA,
  buildSystemPrompt,
  buildUserPrompt,
} from "./prompt.js";
import { detectInjection } from "./sanitize.js";

export const DEFAULT_TIMEOUT_MS = 30000;

export interface GemmaClient {
  generate(args: {
    model: string;
    system: string;
    user: string;
    signal: AbortSignal;
  }): Promise<string>;
}

export function assertGemmaConfig(
  env: NodeJS.ProcessEnv = process.env
): { model: string; apiKey: string } {
  const model = env.GEMMA_MODEL?.trim();
  if (!model) {
    throw new Error("GEMMA_MODEL is required but was not provided or is empty");
  }

  if (model.toLowerCase().startsWith("gemini")) {
    throw new Error(
      "GEMMA_MODEL must be an open-weight Gemma model id; " + "gemini" + "-prefixed ids are not allowed"
    );
  }

  const apiKey = env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is required but was not provided or is empty"
    );
  }

  return { model, apiKey };
}

export function createGemmaClient(
  apiKey: string,
  env: NodeJS.ProcessEnv = process.env
): GemmaClient {
  const ai = new GoogleGenAI({ apiKey });

  return {
    async generate(args: {
      model: string;
      system: string;
      user: string;
      signal: AbortSignal;
    }): Promise<string> {
      if (args.signal.aborted) {
        throw new Error("Operation aborted");
      }

      const inlineSystem = env.GEMMA_INLINE_SYSTEM === "1";
      const contents = inlineSystem
        ? `${args.system}\n\n${args.user}`
        : args.user;

      const config: {
        abortSignal?: AbortSignal;
        systemInstruction?: string;
        responseMimeType?: string;
      } = {
        abortSignal: args.signal,
      };

      if (!inlineSystem) {
        config.systemInstruction = args.system;
        config.responseMimeType = "application/json";
      }

      let abortListener: (() => void) | undefined;
      const abortPromise = new Promise<never>((_, reject) => {
        if (args.signal.aborted) {
          reject(new Error("Operation aborted"));
          return;
        }
        abortListener = () => reject(new Error("Operation aborted"));
        args.signal.addEventListener("abort", abortListener, { once: true });
      });

      try {
        const callPromise = ai.models.generateContent({
          model: args.model,
          contents,
          config,
        });

        const response = await Promise.race([callPromise, abortPromise]);
        return response.text ?? "";
      } finally {
        if (abortListener) {
          args.signal.removeEventListener("abort", abortListener);
        }
      }
    },
  };
}

export function extractJsonArray(raw: string): unknown[] | null {
  if (typeof raw !== "string") {
    return null;
  }

  const text = raw.replace(/```(?:json)?/gi, "").replace(/```/g, "");
  const startIndex = text.indexOf("[");
  const endIndex = text.lastIndexOf("]");

  if (startIndex === -1 || endIndex === -1 || startIndex >= endIndex) {
    return null;
  }

  const jsonSubstring = text.slice(startIndex, endIndex + 1);
  try {
    const parsed: unknown = JSON.parse(jsonSubstring);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

function normalizeRawVerdictItem(raw: unknown): unknown {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }
  const item = { ...(raw as Record<string, unknown>) };

  let score: number;
  if (typeof item.score === "number" && !Number.isNaN(item.score)) {
    score = Math.round(item.score);
  } else if (typeof item.score === "string" && item.score.trim() !== "") {
    const parsedNum = Number(item.score.trim());
    if (Number.isNaN(parsedNum)) {
      return null;
    }
    score = Math.round(parsedNum);
  } else {
    return null;
  }
  item.score = Math.max(0, Math.min(5, score));

  if (typeof item.reasoning === "string") {
    item.reasoning = item.reasoning.slice(0, 600);
  } else if (item.reasoning == null) {
    item.reasoning = "";
  } else {
    item.reasoning = String(item.reasoning).slice(0, 600);
  }

  if (typeof item.suggestion === "string") {
    item.suggestion = item.suggestion.slice(0, 300);
  } else if (item.suggestion == null) {
    item.suggestion = "";
  } else {
    item.suggestion = String(item.suggestion).slice(0, 300);
  }

  if (Array.isArray(item.evidence)) {
    item.evidence = item.evidence
      .filter((e): e is string => typeof e === "string")
      .slice(0, 5);
  } else {
    item.evidence = [];
  }

  return item;
}

function isRateLimitError(err: unknown): boolean {
  if (!err) return false;
  if (typeof err === "object") {
    const errorObj = err as Record<string, unknown>;
    if (
      errorObj.status === 429 ||
      errorObj.code === 429 ||
      errorObj.statusCode === 429
    ) {
      return true;
    }
  }
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED");
}

const INJECTION_NOTE =
  " [Repo text contained instruction-like content; score capped.]";
const MAX_BACKOFFS = 3;
const BACKOFF_MS = [1000, 2000, 4000];
const MAX_ATTEMPTS = 3;

export async function judge(
  snap: RepoSnapshot,
  deps?: {
    client?: GemmaClient;
    sleep?: (ms: number) => Promise<void>;
    env?: NodeJS.ProcessEnv;
    timeoutMs?: number;
  }
): Promise<{ verdicts: GemmaVerdict[]; unscored: CriterionId[] }> {
  const env = deps?.env ?? process.env;
  const cfg = assertGemmaConfig(env);
  const system = buildSystemPrompt();
  const user = buildUserPrompt(snap);
  const client = deps?.client ?? createGemmaClient(cfg.apiKey, env);
  const sleep =
    deps?.sleep ??
    ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));
  const timeoutMs = deps?.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const verdictsByCriterion = new Map<CriterionId, GemmaVerdict>();
  let backoffCount = 0;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const missing = CRITERIA.filter((c) => !verdictsByCriterion.has(c));
    if (missing.length === 0) {
      break;
    }

    let rawOutput: string | null = null;
    let rateLimitExhausted = false;

    while (true) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        rawOutput = await client.generate({
          model: cfg.model,
          system,
          user,
          signal: controller.signal,
        });
        break;
      } catch (err: unknown) {
        if (isRateLimitError(err)) {
          if (backoffCount < MAX_BACKOFFS) {
            const delay = BACKOFF_MS[backoffCount++];
            await sleep(delay);
            continue;
          } else {
            rateLimitExhausted = true;
            break;
          }
        } else {
          break;
        }
      } finally {
        clearTimeout(timeoutId);
      }
    }

    if (rateLimitExhausted) {
      break;
    }

    if (rawOutput === null) {
      continue;
    }

    const rawArray = extractJsonArray(rawOutput);
    if (!rawArray) {
      continue;
    }

    for (const item of rawArray) {
      const normalized = normalizeRawVerdictItem(item);
      if (!normalized) continue;

      const parsed = GemmaVerdict.safeParse(normalized);
      if (!parsed.success) continue;

      const verdict = parsed.data;
      if (
        CRITERIA.includes(verdict.criterion) &&
        !verdictsByCriterion.has(verdict.criterion)
      ) {
        verdictsByCriterion.set(verdict.criterion, verdict);
      }
    }
  }

  const isReadmeInjected = detectInjection(snap.readme ?? "");
  const isFileTreeInjected = detectInjection(snap.fileTree.join("\n"));
  const injected = isReadmeInjected || isFileTreeInjected;

  const finalVerdicts: GemmaVerdict[] = [];
  const unscored: CriterionId[] = [];

  for (const criterion of CRITERIA) {
    const verdict = verdictsByCriterion.get(criterion);
    if (verdict) {
      let score = verdict.score;
      let reasoning = verdict.reasoning;

      const hasEvidence =
        verdict.evidence.length > 0 &&
        verdict.evidence.some((e) => e.trim().length > 0);
      if (!hasEvidence) {
        score = Math.min(score, 2);
      }

      if (injected) {
        score = Math.min(score, 2);
        const baseReasoning = reasoning.slice(0, 600 - INJECTION_NOTE.length);
        reasoning = `${baseReasoning}${INJECTION_NOTE}`;
      }

      finalVerdicts.push({
        ...verdict,
        score,
        reasoning,
      });
    } else {
      unscored.push(criterion);
    }
  }

  return {
    verdicts: finalVerdicts,
    unscored,
  };
}
