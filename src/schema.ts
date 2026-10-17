import { z } from "zod";

export const CriterionId = z.enum([
  "clear_problem",
  "substantial_work",
  "easy_to_verify",
  "demo_explanation",
  "collaboration",
  "submission",
]);

export const RepoSnapshot = z.object({
  url: z.string().url(),
  owner: z.string(),
  name: z.string(),
  isPublic: z.boolean(),
  license: z.string().nullable(),
  readme: z.string().nullable(),
  fileTree: z.array(z.string()),
  commitCount: z.number(),
  contributors: z.array(z.object({ login: z.string(), commits: z.number() })),
  hasCI: z.boolean(),
  hasTests: z.boolean(),
  hasCodeOfConduct: z.boolean(),
  linksMlhCoc: z.boolean(),
  fetchedAt: z.string(),
});

export const RuleCheck = z.object({
  id: z.string(),
  criterion: CriterionId,
  pass: z.boolean(),
  evidence: z.string(),
});

export const GemmaVerdict = z.object({
  criterion: CriterionId,
  score: z.number().int().min(0).max(5),
  reasoning: z.string().max(600),
  evidence: z.array(z.string()).max(5),
  suggestion: z.string().max(300),
});

export const Scorecard = z.object({
  repo: z.string(),
  mode: z.enum(["rules", "rules+gemma"]),
  rules: z.array(RuleCheck),
  verdicts: z.array(GemmaVerdict),
  unscored: z.array(CriterionId),
  total: z.number().nullable(),
  model: z.object({
  name: z.string(),
  servedBy: z.string(),
  openWeight: z.literal(true),
}).nullable(),
  generatedAt: z.string(),
});

export type CriterionId = z.infer<typeof CriterionId>;
export type RepoSnapshot = z.infer<typeof RepoSnapshot>;
export type RuleCheck = z.infer<typeof RuleCheck>;
export type GemmaVerdict = z.infer<typeof GemmaVerdict>;
export type Scorecard = z.infer<typeof Scorecard>;
