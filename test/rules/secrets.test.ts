import { describe, expect, it } from "vitest";
import { checkSecrets } from "../../src/rules/secrets.js";
import { makeSnap } from "./helpers.js";

describe("checkSecrets", () => {
  it("passes when no secret patterns are present", () => {
    const snap = makeSnap({
      readme: "# Safe project\nNo credentials here.",
      fileTree: ["src/index.ts", "package.json"],
    });
    const checks = checkSecrets(snap);
    expect(checks).toHaveLength(1);
    expect(checks[0].id).toBe("secrets.scan");
    expect(checks[0].criterion).toBe("easy_to_verify");
    expect(checks[0].pass).toBe(true);
    expect(checks[0].evidence).toContain("Note: scan covers README and file names only.");
  });

  it("detects GitHub token pattern and does NOT leak the secret value in evidence", () => {
    const fakeToken = "ghp_" + "1234567890abcdefghijklmnopqrstuvwxyz";
    const snap = makeSnap({
      readme: `Use token ${fakeToken} for access`,
    });
    const checks = checkSecrets(snap);
    expect(checks[0].pass).toBe(false);
    expect(checks[0].evidence).toContain("GitHub token pattern found in README");
    expect(checks[0].evidence).not.toContain(fakeToken);
  });

  it("detects Google API key pattern and does NOT leak the secret value in evidence", () => {
    const fakeApiKey = "AIza" + "1234567890abcdefghijklmnopqrstuvwxyz_";
    const snap = makeSnap({
      readme: `Export key: ${fakeApiKey}`,
    });
    const checks = checkSecrets(snap);
    expect(checks[0].pass).toBe(false);
    expect(checks[0].evidence).toContain("Google API key pattern found in README");
    expect(checks[0].evidence).not.toContain(fakeApiKey);
  });

  it("detects sk- style key pattern and does NOT leak the secret value in evidence", () => {
    const fakeSkKey = "sk-" + "abcdefghijklmnopqrstuvwxyz123456";
    const snap = makeSnap({
      readme: `API_KEY=${fakeSkKey}`,
    });
    const checks = checkSecrets(snap);
    expect(checks[0].pass).toBe(false);
    expect(checks[0].evidence).toContain("sk- style API key pattern found in README");
    expect(checks[0].evidence).not.toContain(fakeSkKey);
  });

  it("detects PEM private key header in README", () => {
    const pemHeader = "-----BEGIN RSA PRIVATE KEY-----";
    const snap = makeSnap({
      readme: `Certificate:\n${pemHeader}\n...`,
    });
    const checks = checkSecrets(snap);
    expect(checks[0].pass).toBe(false);
    expect(checks[0].evidence).toContain("PEM private key header found in README");
  });

  it("detects .env in root and subdirectories in fileTree", () => {
    const snapRoot = makeSnap({ fileTree: [".env", "src/index.ts"] });
    expect(checkSecrets(snapRoot)[0].pass).toBe(false);
    expect(checkSecrets(snapRoot)[0].evidence).toContain(".env file found in fileTree");

    const snapNested = makeSnap({ fileTree: ["config/.env", "src/index.ts"] });
    expect(checkSecrets(snapNested)[0].pass).toBe(false);
  });

  it("detects .pem files in fileTree", () => {
    const snap = makeSnap({ fileTree: ["cert.pem", "src/index.ts"] });
    expect(checkSecrets(snap)[0].pass).toBe(false);
    expect(checkSecrets(snap)[0].evidence).toContain(".pem file found in fileTree");
  });

  it("handles null readme safely", () => {
    const snap = makeSnap({ readme: null, fileTree: ["src/index.ts"] });
    const checks = checkSecrets(snap);
    expect(checks[0].pass).toBe(true);
  });
});
