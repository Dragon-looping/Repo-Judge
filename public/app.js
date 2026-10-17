/**
 * public/app.js — RepoJudge frontend application
 *
 * Loaded as type="module" from index.html.
 * Section: Milestone 05 — Core shell, XSS-safe DOM helpers, and input panel
 *
 * SECURITY: Never uses innerHTML, outerHTML, insertAdjacentHTML,
 *           document.write, eval, or new Function anywhere.
 *           All dynamic content goes through textContent or the
 *           safe h() helper which only sets textContent + whitelisted attrs.
 */

"use strict";

// ============================================================
// § CONSTANTS & CRITERION META
// ============================================================

export const CRITERION_ORDER = [
  "clear_problem",
  "substantial_work",
  "easy_to_verify",
  "demo_explanation",
  "collaboration",
  "submission",
];

export const CRITERION_META = {
  clear_problem: {
    title: "Clear Problem Statement",
    desc: "Does the repository clearly articulate the problem being solved?",
    icon: "💡",
  },
  substantial_work: {
    title: "Substantial Work",
    desc: "Is there evidence of meaningful development effort during the hackathon?",
    icon: "⚡",
  },
  easy_to_verify: {
    title: "Easy to Verify",
    desc: "Can evaluators quickly clone, run, and inspect the project?",
    icon: "🔍",
  },
  demo_explanation: {
    title: "Demo & Explanation",
    desc: "Is there a demo, video, or clear explanation of the working project?",
    icon: "🎬",
  },
  collaboration: {
    title: "Collaboration",
    desc: "Does the team follow open-source best practices and codes of conduct?",
    icon: "🤝",
  },
  submission: {
    title: "Submission Quality",
    desc: "Is the repository submission complete, public, and well-structured?",
    icon: "📦",
  },
};

/** Sample repos for the "Try:" buttons */
export const SAMPLES = {
  real: {
    url: "https://github.com/github/gitignore",
    label: "github/gitignore (real public repo)",
  },
  fixture: {
    // XSS fixture — local demo only. Server returns stub data with hostile strings
    // to prove the UI renders them safely. Clearly labelled in UI.
    url: "https://github.com/xss-fixture/demo",
    label: "xss-fixture/demo (local demo fixture — not a live repo)",
  },
};

export const CLIENT_TIMEOUT_MS = 90_000;

// ============================================================
// § STATE MACHINE
// ============================================================
// States: "idle" | "loading" | "success" | "error"

let _state = "idle";
let _currentMode = "rules";

export function getState() { return _state; }

export function setState(next) {
  _state = next;
  applyStateToDOM();
}

function applyStateToDOM() {
  const heroSection   = qs("#hero");
  const loadingView   = qs("#loading-view");
  const errorView     = qs("#error-view");
  const resultsView   = qs("#results-view");

  // All hidden by default
  setClass(loadingView, "is-active", false);
  setClass(errorView,   "is-active", false);
  setClass(resultsView, "is-active", false);

  if (_state === "idle") {
    if (heroSection) heroSection.style.display = "";
    announceStatus("Ready. Enter a GitHub repository URL to begin.");
  } else if (_state === "loading") {
    if (heroSection) heroSection.style.display = "none";
    setClass(loadingView, "is-active", true);
    announceStatus("Analyzing repository, please wait…");
  } else if (_state === "success") {
    if (heroSection) heroSection.style.display = "none";
    setClass(resultsView, "is-active", true);
  } else if (_state === "error") {
    if (heroSection) heroSection.style.display = "none";
    setClass(errorView, "is-active", true);
  }
}

// ============================================================
// § DOM HELPERS — XSS-safe only
// ============================================================

/** querySelector shorthand */
export function qs(sel, root = document) {
  return root.querySelector(sel);
}

/** querySelectorAll shorthand */
export function qsa(sel, root = document) {
  return Array.from(root.querySelectorAll(sel));
}

/**
 * Safe element factory.
 * ONLY sets textContent and a whitelist of safe attributes.
 * NEVER touches innerHTML or outerHTML.
 */
export function h(tag, attrs = {}, children = []) {
  const SAFE_ATTRS = new Set([
    "class", "id", "type", "href", "target", "rel", "aria-label",
    "aria-hidden", "aria-expanded", "aria-controls", "aria-live",
    "aria-atomic", "aria-describedby", "aria-invalid", "role",
    "tabindex", "open", "data-criterion", "style", "for",
    "title", "name", "value", "disabled",
  ]);

  const el = document.createElement(tag);

  for (const [key, val] of Object.entries(attrs)) {
    if (!SAFE_ATTRS.has(key)) continue; // silently ignore unsafe attrs
    if (key === "href") {
      const v = String(val);
      if (
        v.startsWith("#") ||
        v.startsWith("/") ||
        isSafeExternalUrl(v)
      ) {
        el.setAttribute("href", v);
      }
    } else if (key === "style") {
      const v = String(val);
      if (!/url\s*\(|expression\s*\(/i.test(v)) {
        el.setAttribute("style", v);
      }
    } else {
      el.setAttribute(key, String(val));
    }
  }

  const items = Array.isArray(children) ? children : [children];
  for (const child of items) {
    if (typeof child === "string") {
      el.appendChild(document.createTextNode(child));
    } else if (child instanceof Node) {
      el.appendChild(child);
    }
  }

  return el;
}

/** Set/unset a CSS class */
export function setClass(el, cls, on) {
  if (!el) return;
  if (on) el.classList.add(cls);
  else el.classList.remove(cls);
}

/** Announce text to screen readers via aria-live */
export function announceStatus(text) {
  const r = qs("#status-region");
  if (!r) return;
  r.textContent = "";
  requestAnimationFrame(() => { r.textContent = text; });
}

/** Announce copy confirmation */
export function announceCopy(text) {
  const r = qs("#copy-region");
  if (!r) return;
  r.textContent = "";
  requestAnimationFrame(() => { r.textContent = text; });
}

/** Validate safe external URL */
export function isSafeExternalUrl(url) {
  try {
    const p = new URL(url);
    return p.protocol === "https:" && p.hostname === "github.com";
  } catch {
    return false;
  }
}

/** Format a repo name from URL safely */
export function repoNameFromUrl(url) {
  try {
    const p = new URL(url);
    const parts = p.pathname.split("/").filter(Boolean);
    if (parts.length >= 2) return `${parts[0]}/${parts[1]}`;
    if (parts.length === 1) return parts[0];
    return url;
  } catch {
    return String(url);
  }
}

/** Format ISO date safely */
export function formatDate(iso) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return String(iso);
  }
}

// ============================================================
// § CLIENT URL VALIDATION
// ============================================================

const GITHUB_PATH_RE = /^\/([A-Za-z0-9](?:[A-Za-z0-9-]{0,38})?)\/([A-Za-z0-9._-]{1,100})\/?(?:\.git)?$/;

export function validateUrl(raw) {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: false, message: "Please enter a GitHub repository URL." };
  if (trimmed.length > 200) return { ok: false, message: "URL is too long (max 200 characters)." };

  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false, message: "Not a valid URL. Example: https://github.com/owner/repo" };
  }
  if (parsed.protocol !== "https:") {
    return { ok: false, message: "Only https:// URLs are accepted." };
  }
  const host = parsed.hostname.toLowerCase();
  if (host !== "github.com" && host !== "www.github.com") {
    return { ok: false, message: "URL must be a github.com repository." };
  }
  if (!GITHUB_PATH_RE.test(parsed.pathname)) {
    return { ok: false, message: "Path must be exactly /owner/repo — no extra segments." };
  }
  return { ok: true, message: "" };
}

// ============================================================
// § API
// ============================================================

export async function fetchJudge(url, mode, signal) {
  const response = await fetch("/api/judge", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, mode }),
    signal,
  });

  const dataSource = response.headers.get("X-RepoJudge-Data-Source") ?? "live";

  if (!response.ok) {
    let errorText = "Evaluation failed.";
    let retryAfter = null;
    try {
      const body = await response.json();
      if (body && typeof body.error === "string") {
        errorText = body.error;
      }
    } catch {
      errorText = `Request failed (HTTP ${response.status}).`;
    }
    if (response.status === 429) {
      retryAfter = response.headers.get("Retry-After");
    }
    const err = new Error(errorText);
    err.status = response.status;
    err.retryAfter = retryAfter;
    throw err;
  }

  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error("Server returned an unreadable response.");
  }

  return { scorecard: data, dataSource };
}

export function showError(message, retryAfter = null) {
  const msgEl = qs("#error-message");
  const retryHint = qs("#retry-after-hint");

  if (msgEl) msgEl.textContent = String(message);

  if (retryHint) {
    if (retryAfter) {
      retryHint.textContent = `Please wait ${retryAfter} second(s) before retrying.`;
      retryHint.style.display = "";
    } else {
      retryHint.textContent = "";
      retryHint.style.display = "none";
    }
  }

  setState("error");

  const errorHeading = qs("#error-heading");
  if (errorHeading) {
    errorHeading.focus();
    errorHeading.setAttribute("tabindex", "-1");
  }

  announceStatus(`Error: ${String(message)}`);
}

let _currentAbortController = null;
let _lastScorecard = null;

export function getLastScorecard() { return _lastScorecard; }
export function setLastScorecard(sc) { _lastScorecard = sc; }

// ============================================================
// § INPUT PANEL & SAMPLE LINKS
// ============================================================

export function initInputPanel() {
  const form       = qs("#judge-form");
  const urlInput   = qs("#repo-url");
  const feedback   = qs("#url-feedback");
  const analyzeBtn = qs("#analyze-btn");
  const modeInputs = qsa("input[name='mode']");

  if (!form || !urlInput) return;

  // Sample buttons
  const sampleBtns = qsa("[data-sample]");
  for (const btn of sampleBtns) {
    btn.addEventListener("click", () => {
      const key = btn.dataset.sample;
      if (SAMPLES[key]) {
        urlInput.value = SAMPLES[key].url;
        clearFeedback();
        urlInput.focus();
      }
    });
  }

  // Inline URL validation on blur/input
  urlInput.addEventListener("input", () => {
    if (urlInput.value.trim() === "") {
      clearFeedback();
      return;
    }
    const { ok, message } = validateUrl(urlInput.value);
    if (!ok) {
      showFeedback(message, false);
    } else {
      showFeedback("Looks good!", true);
    }
  });

  urlInput.addEventListener("blur", () => {
    if (urlInput.value.trim() === "") {
      clearFeedback();
    }
  });

  // Form submit
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (getState() === "loading") return;

    const rawUrl = urlInput.value.trim();
    const { ok, message } = validateUrl(rawUrl);
    if (!ok) {
      showFeedback(message, false);
      urlInput.setAttribute("aria-invalid", "true");
      urlInput.focus();
      return;
    }

    clearFeedback();
    urlInput.setAttribute("aria-invalid", "false");

    const selectedMode = modeInputs.find((r) => r.checked)?.value ?? "rules";
    _currentMode = selectedMode;
    updateNavMode(_currentMode);

    if (_currentAbortController) {
      _currentAbortController.abort();
    }
    _currentAbortController = new AbortController();
    const signal = _currentAbortController.signal;

    if (analyzeBtn) analyzeBtn.disabled = true;
    setState("loading");

    const clientTimeout = setTimeout(() => {
      _currentAbortController?.abort();
    }, CLIENT_TIMEOUT_MS);

    try {
      const { scorecard, dataSource } = await fetchJudge(rawUrl, selectedMode, signal);
      clearTimeout(clientTimeout);

      _lastScorecard = scorecard;
      setState("success");
      if (typeof window.__renderResultsHook === "function") {
        window.__renderResultsHook(scorecard, dataSource);
      }
    } catch (err) {
      clearTimeout(clientTimeout);

      if (err.name === "AbortError") {
        showError("Request was cancelled or timed out. Please retry.");
        return;
      }

      const msg = err.message ?? "Evaluation failed.";
      const retryAfter = err.retryAfter ?? null;
      showError(msg, retryAfter);
    } finally {
      if (analyzeBtn) analyzeBtn.disabled = false;
    }
  });

  function showFeedback(msg, isOk) {
    if (!feedback) return;
    feedback.textContent = msg;
    setClass(feedback, "is-error", !isOk);
    setClass(feedback, "is-ok", isOk);
  }

  function clearFeedback() {
    if (!feedback) return;
    feedback.textContent = "";
    setClass(feedback, "is-error", false);
    setClass(feedback, "is-ok", false);
    urlInput.setAttribute("aria-invalid", "false");
  }
}

// ============================================================
// § NAVIGATION & CONFIG
// ============================================================

export function initNav() {
  const menuBtn    = qs("#mobile-menu-btn");
  const mobilePanel = qs("#mobile-panel");
  const mobileLinks = qsa(".nav__mobile-link, #mobile-panel .nav__mobile-link");

  if (!menuBtn || !mobilePanel) return;

  function openMenu() {
    mobilePanel.classList.add("is-open");
    menuBtn.setAttribute("aria-expanded", "true");
  }

  function closeMenu() {
    mobilePanel.classList.remove("is-open");
    menuBtn.setAttribute("aria-expanded", "false");
  }

  menuBtn.addEventListener("click", () => {
    const isOpen = menuBtn.getAttribute("aria-expanded") === "true";
    if (isOpen) closeMenu(); else openMenu();
  });

  for (const link of mobileLinks) {
    link.addEventListener("click", closeMenu);
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu();
  });
}

export function updateNavMode(mode) {
  const badge = qs("#nav-mode-badge");
  const text  = qs("#nav-mode-text");
  if (!badge || !text) return;
  text.textContent = mode === "rules+gemma" ? "Rules + Gemma 4" : "Rules Only";
  setClass(badge, "is-rules", mode === "rules");
  setClass(badge, "is-gemma", mode === "rules+gemma");
}

export function initModeSelector() {
  const modeInputs = qsa("input[name='mode']");
  const gemmaStep  = qs("#loading-gemma-step");

  for (const radio of modeInputs) {
    radio.addEventListener("change", () => {
      _currentMode = radio.value;
      updateNavMode(_currentMode);
      if (gemmaStep) {
        gemmaStep.style.display = _currentMode === "rules+gemma" ? "" : "none";
      }
    });
  }

  // Arrow-key keyboard navigation for accessible radio group
  const modeGroup = qs(".mode-selector__group");
  if (modeGroup) {
    modeGroup.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      const focused = document.activeElement;
      const all = qsa("input[name='mode']", modeGroup);
      const idx = all.indexOf(focused);
      if (idx === -1) return;
      const next = e.key === "ArrowRight"
        ? (idx + 1) % all.length
        : (idx - 1 + all.length) % all.length;
      all[next].focus();
      all[next].checked = true;
      all[next].dispatchEvent(new Event("change", { bubbles: true }));
      e.preventDefault();
    });
  }
}

export function initActiveLinks() {
  const links = qsa(".nav__link[href^='#']");
  const sections = links.map((l) => qs(l.getAttribute("href"))).filter(Boolean);

  if (!("IntersectionObserver" in window)) return;

  const obs = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute("id");
          for (const link of links) {
            setClass(link, "is-active", link.getAttribute("href") === `#${id}`);
          }
        }
      }
    },
    { rootMargin: "-40% 0px -55% 0px" }
  );

  for (const sec of sections) obs.observe(sec);
}

export function initResetButtons() {
  const analyzeAnotherBtn = qs("#analyze-another-btn");
  const errorResetBtn     = qs("#error-reset-btn");
  const retryBtn          = qs("#retry-btn");

  function resetToIdle() {
    setState("idle");
    const input = qs("#repo-url");
    if (input) {
      input.value = "";
      input.removeAttribute("aria-invalid");
      input.focus();
    }
  }

  if (analyzeAnotherBtn) {
    analyzeAnotherBtn.addEventListener("click", resetToIdle);
  }
  if (errorResetBtn) {
    errorResetBtn.addEventListener("click", resetToIdle);
  }
  if (retryBtn) {
    retryBtn.addEventListener("click", () => {
      const form = qs("#judge-form");
      if (form) {
        setState("idle");
        form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
      }
    });
  }
}

export async function fetchConfig() {
  try {
    const resp = await fetch("/api/config");
    if (!resp.ok) return { repoUrl: null };
    const data = await resp.json();
    if (
      data &&
      typeof data.repoUrl === "string" &&
      data.repoUrl.startsWith("https://github.com/")
    ) {
      return { repoUrl: data.repoUrl };
    }
    return { repoUrl: null };
  } catch {
    return { repoUrl: null };
  }
}

export async function applyConfig() {
  const { repoUrl } = await fetchConfig();

  const links = [
    qs("#nav-github-link"),
    qs("#mobile-github-link"),
    qs("#footer-github-link"),
  ];

  for (const link of links) {
    if (!link) continue;
    if (repoUrl) {
      link.setAttribute("href", repoUrl);
      link.classList.remove("nav__github--disabled", "footer-link--disabled");
    } else {
      link.removeAttribute("href");
      link.classList.add(
        link.classList.contains("footer-link") ? "footer-link--disabled" : "nav__github--disabled"
      );
      const label = link.getAttribute("aria-label") ?? "";
      link.setAttribute("aria-label", label.replace("Open", "GitHub repository (link pending) —"));
    }
  }
}

// ============================================================
// § EFFECTS & VISUALIZATIONS
// ============================================================

let _orbitRunning = false;
let _orbitRafId = null;
let _orbitAngle = 0;
let _parallaxX = 0;
let _parallaxY = 0;
let _parallaxTargetX = 0;
let _parallaxTargetY = 0;

const ORBIT_NODES = [
  { ring: 0, speed: 0.4,  color: "#5ce1ff", size: 3, startAngle: 0   },
  { ring: 0, speed: 0.4,  color: "#7c5cff", size: 2, startAngle: 2.1 },
  { ring: 0, speed: 0.4,  color: "#9aa4c0", size: 2, startAngle: 4.2 },
  { ring: 1, speed: 0.25, color: "#5ce1ff", size: 4, startAngle: 1.0 },
  { ring: 1, speed: 0.25, color: "#7c5cff", size: 3, startAngle: 3.1 },
  { ring: 2, speed: 0.15, color: "#7c5cff", size: 5, startAngle: 0.5 },
  { ring: 2, speed: 0.15, color: "#5ce1ff", size: 3, startAngle: 3.6 },
];

const ORBIT_RADII = [80, 140, 210];

export function drawOrbit(canvas, ts) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const W = canvas.width;
  const H = canvas.height;
  const cx = W / 2 + _parallaxX * 0.05;
  const cy = H / 2 + _parallaxY * 0.05;

  ctx.clearRect(0, 0, W, H);

  // Core — glowing hexagon
  const coreSize = 28;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(_orbitAngle * 0.3);

  const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, coreSize * 2.5);
  grad.addColorStop(0, "rgba(124, 92, 255, 0.25)");
  grad.addColorStop(0.4, "rgba(92, 225, 255, 0.10)");
  grad.addColorStop(1, "transparent");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, coreSize * 2.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(124, 92, 255, 0.6)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 - Math.PI / 6;
    const x = Math.cos(a) * coreSize;
    const y = Math.sin(a) * coreSize;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.stroke();

  ctx.fillStyle = "rgba(92, 225, 255, 0.9)";
  ctx.beginPath();
  ctx.arc(0, 0, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Orbit rings
  for (let i = 0; i < ORBIT_RADII.length; i++) {
    const r = ORBIT_RADII[i];
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255,255,255, ${0.04 - i * 0.01})`;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Orbiting nodes
  const tSec = ts / 1000;
  for (const node of ORBIT_NODES) {
    const r = ORBIT_RADII[node.ring];
    const angle = node.startAngle + tSec * node.speed + _orbitAngle;
    const nx = cx + Math.cos(angle) * r;
    const ny = cy + Math.sin(angle) * r;

    const ng = ctx.createRadialGradient(nx, ny, 0, nx, ny, node.size * 3);
    ng.addColorStop(0, node.color + "aa");
    ng.addColorStop(1, "transparent");
    ctx.fillStyle = ng;
    ctx.beginPath();
    ctx.arc(nx, ny, node.size * 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = node.color;
    ctx.beginPath();
    ctx.arc(nx, ny, node.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function startOrbit() {
  const canvas = qs("#orbit-canvas");
  if (!canvas || _orbitRunning) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  _orbitRunning = true;
  let lastTs = null;

  function frame(ts) {
    if (!_orbitRunning) return;
    if (lastTs !== null) {
      const dt = (ts - lastTs) / 1000;
      _orbitAngle += dt * 0.2;
      _parallaxX += (_parallaxTargetX - _parallaxX) * 0.08;
      _parallaxY += (_parallaxTargetY - _parallaxY) * 0.08;
    }
    lastTs = ts;
    drawOrbit(canvas, ts);
    _orbitRafId = requestAnimationFrame(frame);
  }

  _orbitRafId = requestAnimationFrame(frame);
}

export function stopOrbit() {
  _orbitRunning = false;
  if (_orbitRafId !== null) {
    cancelAnimationFrame(_orbitRafId);
    _orbitRafId = null;
  }
}

export function initHeroGlow() {
  const hero = qs("#hero");
  const glow = qs("#hero-glow");
  if (!hero || !glow) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  let glowRafPending = false;
  hero.addEventListener("pointermove", (e) => {
    if (glowRafPending) return;
    glowRafPending = true;
    requestAnimationFrame(() => {
      const rect = hero.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      glow.style.transform = `translate(${x - 300}px, ${y - 300}px)`;

      _parallaxTargetX = (x - rect.width / 2) * 0.5;
      _parallaxTargetY = (y - rect.height / 2) * 0.5;
      glowRafPending = false;
    });
  }, { passive: true });
}

export function initMagneticButton() {
  const btn = qs("#analyze-btn");
  if (!btn) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (window.matchMedia("(pointer: coarse)").matches) return;

  const MAX_OFFSET = 6;
  let btnRafPending = false;

  btn.addEventListener("pointermove", (e) => {
    if (btnRafPending) return;
    btnRafPending = true;
    requestAnimationFrame(() => {
      const rect = btn.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const radius = rect.width * 0.8;

      if (dist < radius) {
        const factor = (1 - dist / radius) * MAX_OFFSET;
        const ox = (dx / dist) * factor;
        const oy = (dy / dist) * factor;
        btn.style.transform = `translate(${ox}px, ${oy}px) translateY(-2px)`;
        const bx = ((e.clientX - rect.left) / rect.width) * 100;
        const by = ((e.clientY - rect.top) / rect.height) * 100;
        btn.style.setProperty("--btn-mx", `${bx}%`);
        btn.style.setProperty("--btn-my", `${by}%`);
      }
      btnRafPending = false;
    });
  }, { passive: true });

  btn.addEventListener("pointerleave", () => {
    btn.style.transform = "";
  }, { passive: true });
}

export function initCardTilt() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (window.matchMedia("(pointer: coarse)").matches) return;

  const MAX_TILT = 6;

  function handleTilt(e, card) {
    const rect = card.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const rx = ((e.clientY - cy) / (rect.height / 2)) * -MAX_TILT;
    const ry = ((e.clientX - cx) / (rect.width / 2)) * MAX_TILT;
    card.style.transform = `perspective(800px) rotateX(${rx}deg) rotateY(${ry}deg)`;
  }

  const grid = qs("#criteria-grid");
  if (!grid) return;

  grid.addEventListener("pointermove", (e) => {
    const card = e.target.closest(".criterion-card");
    if (!card) return;
    requestAnimationFrame(() => handleTilt(e, card));
  }, { passive: true });

  grid.addEventListener("pointerleave", (e) => {
    const card = e.target.closest?.(".criterion-card");
    if (card) card.style.transform = "";
  }, { passive: true });
}

let _revealObserver = null;
export function initReveal() {
  const items = qsa(".reveal");
  if (!("IntersectionObserver" in window)) {
    for (const el of items) setClass(el, "no-observer", true);
    return;
  }

  if (_revealObserver) _revealObserver.disconnect();
  _revealObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          setClass(entry.target, "is-visible", true);
          _revealObserver.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.12 }
  );

  for (const el of items) _revealObserver.observe(el);
}

export function initVisibilityCleanup() {
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stopOrbit();
    } else if (getState() === "idle") {
      startOrbit();
    }
  });
}

// ============================================================
// § TESTABILITY EXPORTS
// ============================================================
if (typeof globalThis !== "undefined") {
  globalThis.__rjExports = {
    h,
    validateUrl,
    isSafeExternalUrl,
    repoNameFromUrl,
    CRITERION_ORDER,
  };
}

// ============================================================
// § INIT
// ============================================================

function init() {
  setState("idle");
  initNav();
  initActiveLinks();
  initInputPanel();
  initModeSelector();
  initResetButtons();
  initHeroGlow();
  initMagneticButton();
  startOrbit();
  initReveal();
  initVisibilityCleanup();
  applyConfig();
  updateNavMode("rules");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
