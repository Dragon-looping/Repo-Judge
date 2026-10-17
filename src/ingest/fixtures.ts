import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { RepoSnapshot } from "../schema.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FIXTURES_DIR = path.resolve(__dirname, "../../test/fixtures");

export const FIXTURE_NAMES = [
  "good-repo",
  "bare-repo",
  "injection-repo",
] as const;

export const fixtureNames = FIXTURE_NAMES;
export type FixtureName = (typeof FIXTURE_NAMES)[number];

export function loadFixture(name: string): RepoSnapshot {
  const clean = name.endsWith(".json") ? name.slice(0, -5) : name;
  const canonicalName =
    clean === "good"
      ? "good-repo"
      : clean === "bare"
        ? "bare-repo"
        : clean === "injection"
          ? "injection-repo"
          : clean;

  const targetPath = path.join(FIXTURES_DIR, `${canonicalName}.json`);
  if (!fs.existsSync(targetPath)) {
    throw new Error(`Fixture not found: ${name} (resolved to ${targetPath})`);
  }

  const raw = fs.readFileSync(targetPath, "utf-8");
  const parsed = JSON.parse(raw);
  return RepoSnapshot.parse(parsed);
}
