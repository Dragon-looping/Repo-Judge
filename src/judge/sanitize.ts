export const MAX_FIELD_CHARS = 12000;

export const INJECTION_PATTERNS: readonly RegExp[] = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+instructions/i,
  /disregard\s+(the\s+)?(system|previous|above)/i,
  /you\s+are\s+now/i,
  /(give|score|rate)\b[\s\S]{0,30}\b5\s*\/\s*5/i,
  /system\s+prompt/i,
  /(act|behave)\s+as/i,
  /new\s+instructions/i,
];

// Invisible, zero-width, and bidi control characters
const ZERO_WIDTH_REGEX =
  /[\u200B\u200C\u200D\u2060\uFEFF\u00AD\u202A-\u202E\u2066-\u2069]/g;

// Control characters except \t (0x09) and \n (0x0A)
const CONTROL_CHARS_REGEX = /[\x00-\x08\x0B-\x1F\x7F\u0080-\u009F]/g;

// Matches <repo_content> or </repo_content> with optional whitespace and slashes
const REPO_CONTENT_TAG_REGEX = /<[\s]*\/?[\s]*repo_content[\s]*\/?[\s]*>/gi;

export function sanitizeRepoText(
  text: string,
  maxLen?: number
): string;
export function sanitizeRepoText(
  text: string | null | undefined,
  maxLen?: number
): string;
export function sanitizeRepoText(
  text: unknown,
  maxLen: number = MAX_FIELD_CHARS
): string {
  if (text === null || text === undefined) {
    return "";
  }

  let str = typeof text === "string" ? text : String(text);

  // 1. Remove zero-width and invisible characters
  str = str.replace(ZERO_WIDTH_REGEX, "");

  // 2. Remove EVERY occurrence of <repo_content> and </repo_content> (loop until stable)
  let prev: string;
  do {
    prev = str;
    str = str.replace(REPO_CONTENT_TAG_REGEX, "");
  } while (str !== prev);

  // 3. Strip null bytes and other control characters except \n and \t
  str = str.replace(CONTROL_CHARS_REGEX, "");

  // 4. Collapse runs of 3+ newlines into 2, collapse runs of spaces/tabs into a single space, and trim
  str = str.replace(/[ \t]*\r?\n[ \t]*/g, "\n");
  str = str.replace(/\n{3,}/g, "\n\n");
  str = str.replace(/[ \t]+/g, " ");
  str = str.trim();

  // 5. Cap length at maxLen; if cut, append "\n[truncated]"
  const limit = Math.max(0, maxLen);
  if (str.length > limit) {
    str = str.slice(0, limit) + "\n[truncated]";
  }

  return str;
}

export function detectInjection(text: string): boolean;
export function detectInjection(text: string | null | undefined): boolean;
export function detectInjection(text: unknown): boolean {
  if (text === null || text === undefined) {
    return false;
  }

  const str = typeof text === "string" ? text : String(text);
  const clean = str.replace(ZERO_WIDTH_REGEX, "");

  return INJECTION_PATTERNS.some((pattern) => pattern.test(clean));
}
