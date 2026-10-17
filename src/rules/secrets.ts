import { RepoSnapshot, RuleCheck } from "../schema.js";

const GITHUB_TOKEN_REGEX = /ghp_[A-Za-z0-9]{36}/;
const GOOGLE_API_KEY_REGEX = /AIza[0-9A-Za-z_-]{35}/;
const SK_KEY_REGEX = /sk-[A-Za-z0-9]{20,}/;
const PEM_KEY_HEADER_REGEX = /-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----/;

export function checkSecrets(snap: RepoSnapshot): RuleCheck[] {
  const findings: string[] = [];

  if (snap.readme) {
    if (GITHUB_TOKEN_REGEX.test(snap.readme)) {
      findings.push("GitHub token pattern found in README");
    }
    if (GOOGLE_API_KEY_REGEX.test(snap.readme)) {
      findings.push("Google API key pattern found in README");
    }
    if (SK_KEY_REGEX.test(snap.readme)) {
      findings.push("sk- style API key pattern found in README");
    }
    if (PEM_KEY_HEADER_REGEX.test(snap.readme)) {
      findings.push("PEM private key header found in README");
    }
  }

  for (const path of snap.fileTree) {
    if (path === ".env" || path.endsWith("/.env")) {
      findings.push(".env file found in fileTree");
      break;
    }
  }

  for (const path of snap.fileTree) {
    if (path.endsWith(".pem")) {
      findings.push(".pem file found in fileTree");
      break;
    }
  }

  const pass = findings.length === 0;
  const evidence = pass
    ? "No secrets detected. Note: scan covers README and file names only."
    : `${findings.join("; ")}. Note: scan covers README and file names only.`;

  return [
    {
      id: "secrets.scan",
      criterion: "easy_to_verify",
      pass,
      evidence,
    },
  ];
}
