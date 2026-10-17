import { RepoSnapshot, RuleCheck } from "../schema.js";

const GEMMA_4_REGEX = /\bgemma[- ]4\b/i;

export function checkOpenWeight(snap: RepoSnapshot): RuleCheck[] {
  const hasModelCard = snap.fileTree.some(
    (f) => f === "MODEL_CARD.md" || f.toLowerCase() === "model_card.md"
  );
  const mentionsGemma = snap.readme !== null && GEMMA_4_REGEX.test(snap.readme);

  return [
    {
      id: "openweight.model_card",
      criterion: "submission",
      pass: hasModelCard,
      evidence: hasModelCard
        ? "MODEL_CARD.md present in file tree"
        : "MODEL_CARD.md missing from file tree",
    },
    {
      id: "openweight.gemma_mention",
      criterion: "submission",
      pass: mentionsGemma,
      evidence: mentionsGemma
        ? "README mentions Gemma 4"
        : "README does not mention Gemma 4",
    },
  ];
}
