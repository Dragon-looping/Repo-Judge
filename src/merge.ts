import {
  CriterionId,
  GemmaVerdict,
  RepoSnapshot,
  RuleCheck,
  Scorecard,
} from "./schema.js";

const ALL_CRITERIA: CriterionId[] = CriterionId.options;

export function rulesScore(rules: RuleCheck[]): Record<CriterionId, number> {
  const result: Partial<Record<CriterionId, number>> = {};

  for (const criterion of ALL_CRITERIA) {
    const matching = rules.filter((r) => r.criterion === criterion);
    if (matching.length === 0) {
      continue;
    }
    const passed = matching.filter((r) => r.pass).length;
    const score = Math.round(((passed / matching.length) * 5) * 10) / 10;
    result[criterion] = score;
  }

  return result as Record<CriterionId, number>;
}

export function mergeScorecard(
  snap: RepoSnapshot,
  rules: RuleCheck[],
  verdicts: GemmaVerdict[],
  mode: "rules" | "rules+gemma",
  unscored?: CriterionId[],
  servedBy?: string | null
): Scorecard {
  const repo = `${snap.owner}/${snap.name}`;
  const generatedAt = new Date().toISOString();
  const rScores = rulesScore(rules);

  if (mode === "rules") {
    let sum = 0;
    for (const criterion of ALL_CRITERIA) {
      sum += rScores[criterion] ?? 0;
    }
    const total = Math.round(sum * 10) / 10;

    const scorecard: Scorecard = {
      repo,
      mode: "rules",
      rules,
      verdicts: [],
      unscored: [],
      total,
      model: null,
      generatedAt,
    };

    return Scorecard.parse(scorecard);
  }

  // mode === "rules+gemma"
  if (verdicts.length > 0 && !servedBy) {
    throw new Error(
      "servedBy required in rules+gemma mode when verdicts exist"
    );
  }

  const verdictMap = new Map<CriterionId, GemmaVerdict>();
  for (const verdict of verdicts) {
    verdictMap.set(verdict.criterion, verdict);
  }

  const missingVerdicts = ALL_CRITERIA.filter((c) => !verdictMap.has(c));
  const mergedUnscoredSet = new Set<CriterionId>([
    ...(unscored ?? []),
    ...missingVerdicts,
  ]);
  const finalUnscored: CriterionId[] = ALL_CRITERIA.filter((c) =>
    mergedUnscoredSet.has(c)
  );

  let total: number | null = null;
  if (finalUnscored.length === 0) {
    let sum = 0;
    for (const criterion of ALL_CRITERIA) {
      const gScore = verdictMap.get(criterion)!.score;
      const rScore = rScores[criterion];
      if (rScore !== undefined) {
        sum += (rScore + gScore) / 2;
      } else {
        sum += gScore;
      }
    }
    total = Math.round(sum * 10) / 10;
  }

  const model = servedBy
    ? {
        name: process.env.GEMMA_MODEL ?? "unknown",
        servedBy,
        openWeight: true as const,
      }
    : null;

  const scorecard: Scorecard = {
    repo,
    mode: "rules+gemma",
    rules,
    verdicts,
    unscored: finalUnscored,
    total,
    model,
    generatedAt,
  };

  return Scorecard.parse(scorecard);
}
