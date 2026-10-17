/**
 * test/server/xss.test.ts
 *
 * XSS Regression Test Suite:
 * 1. Static AST/Regex scan of public/app.js ensuring zero usage of unsafe sinks:
 *    - innerHTML
 *    - outerHTML
 *    - insertAdjacentHTML
 *    - document.write
 *    - eval(
 *    - new Function
 * 2. Behavioral verification using hand-written FakeDOM:
 *    - Feeds hostile rule evidence (<img src=x onerror=alert(1)>, <script>alert(1)</script>)
 *    - Feeds hostile AI reasoning, evidence arrays, suggestions
 *    - Asserts that no element with tag 'script' or 'img' is created
 *    - Asserts that no attribute starting with 'on' (e.g. onerror) is set
 *    - Asserts that hostile text appears strictly as text content
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { setupFakeDOM, FakeElement } from "./helpers/fake-dom.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const APP_JS_PATH = path.resolve(__dirname, "../../public/app.js");

describe("XSS Defense & Rendering Safety", () => {
  // ---- 1. Static Scan ---------------------------------------
  it("public/app.js contains zero forbidden DOM-injection sinks", () => {
    const code = fs.readFileSync(APP_JS_PATH, "utf8");

    // Remove comments to avoid false-positives on explanatory documentation
    const codeWithoutComments = code
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*/g, "");

    const forbiddenPatterns = [
      { name: "innerHTML", re: /\.innerHTML\b/ },
      { name: "outerHTML", re: /\.outerHTML\b/ },
      { name: "insertAdjacentHTML", re: /\.insertAdjacentHTML\b/ },
      { name: "document.write", re: /document\.write\b/ },
      { name: "eval()", re: /\beval\s*\(/ },
      { name: "new Function()", re: /new\s+Function\s*\(/ },
    ];

    for (const pattern of forbiddenPatterns) {
      const match = pattern.re.exec(codeWithoutComments);
      expect(
        match,
        `Found forbidden sink '${pattern.name}' in public/app.js: "${match?.[0]}"`
      ).toBeNull();
    }
  });

  // ---- 2. Behavioral XSS Injection Test -----------------------
  describe("Behavioral render safety with hostile payloads", () => {
    let cleanupDOM: () => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let rjExports: any;

    beforeEach(async () => {
      const { cleanup } = setupFakeDOM();
      cleanupDOM = cleanup;
      // Dynamically import public/app.js with fake DOM active
      // @ts-expect-error - public/app.js is a plain vanilla JS module without typings
      const mod = await import("../../public/app.js");
      rjExports = mod;
    });

    afterEach(() => {
      cleanupDOM();
    });

    it("renders malicious rule evidence safely without executing or creating elements", () => {
      const hostilePayload = '<img src=x onerror=alert(1)> <script>alert(1)</script>';

      const rules = [
        {
          id: "rule_xss_test",
          criterion: "clear_problem" as const,
          pass: false,
          evidence: hostilePayload,
        },
      ];

      const card = rjExports.buildCriterionCard(
        "clear_problem",
        rules,
        null,
        "rules"
      ) as FakeElement;

      expect(card).toBeDefined();

      // Check all elements inside the generated card tree
      const allElements = [card, ...card.querySelectorAll("*")];

      for (const el of allElements) {
        // Assert no element with tag 'script' or 'img' was created
        expect(el.tagName).not.toBe("SCRIPT");
        expect(el.tagName).not.toBe("IMG");

        // Assert no event-handler attributes (onerror, onload, onclick, etc.)
        for (const attrName of el.attributes.keys()) {
          expect(attrName.startsWith("on")).toBe(false);
        }
      }

      // Assert hostile string is preserved strictly as plain textContent
      expect(card.textContent).toContain(hostilePayload);
    });

    it("renders malicious Gemma verdicts safely as text only", () => {
      const hostilePayload = '<img src=x onerror=alert(1)> <script>alert(1)</script>';

      const verdict = {
        criterion: "clear_problem" as const,
        score: 3,
        reasoning: `Hostile reasoning: ${hostilePayload}`,
        evidence: [`Evidence 1: ${hostilePayload}`],
        suggestion: `Suggestion: ${hostilePayload}`,
      };

      const card = rjExports.buildCriterionCard(
        "clear_problem",
        [],
        verdict,
        "rules+gemma"
      ) as FakeElement;

      expect(card).toBeDefined();

      const allElements = [card, ...card.querySelectorAll("*")];

      for (const el of allElements) {
        expect(el.tagName).not.toBe("SCRIPT");
        expect(el.tagName).not.toBe("IMG");

        for (const attrName of el.attributes.keys()) {
          expect(attrName.startsWith("on")).toBe(false);
        }
      }

      expect(card.textContent).toContain("Hostile reasoning:");
      expect(card.textContent).toContain(hostilePayload);
    });

    it("safe DOM helper h() strips unsafe attributes and handles safe hrefs", () => {
      const safeLink = rjExports.h("a", {
        href: "https://github.com/owner/repo",
        class: "my-link",
      }) as FakeElement;

      expect(safeLink.getAttribute("href")).toBe("https://github.com/owner/repo");
      expect(safeLink.getAttribute("class")).toBe("my-link");

      // Dangerous javascript: link should be omitted
      const badLink = rjExports.h("a", {
        href: "javascript:alert(1)",
      }) as FakeElement;

      expect(badLink.hasAttribute("href")).toBe(false);

      // Dangerous event handlers (onclick, onerror) should be ignored
      const badBtn = rjExports.h("button", {
        onclick: "alert(1)",
        onerror: "alert(1)",
      }) as FakeElement;

      expect(badBtn.hasAttribute("onclick")).toBe(false);
      expect(badBtn.hasAttribute("onerror")).toBe(false);
    });
  });
});
