/**
 * test/server/helpers/fake-dom.ts
 *
 * Minimal hand-written fake DOM for testing render helpers without jsdom.
 * Allows verifying that hostile payloads like <img src=x onerror=alert(1)>
 * and <script>alert(1)</script> end up ONLY as textContent and NEVER
 * as HTML element tags or on* attributes.
 */

export class FakeNode {
  childNodes: FakeNode[] = [];
  parentNode: FakeNode | null = null;
  nodeType = 1;

  appendChild(child: FakeNode): FakeNode {
    child.parentNode = this;
    this.childNodes.push(child);
    return child;
  }

  insertBefore(newChild: FakeNode, refChild: FakeNode | null): FakeNode {
    newChild.parentNode = this;
    if (!refChild) {
      this.childNodes.push(newChild);
      return newChild;
    }
    const idx = this.childNodes.indexOf(refChild);
    if (idx === -1) {
      this.childNodes.push(newChild);
    } else {
      this.childNodes.splice(idx, 0, newChild);
    }
    return newChild;
  }

  removeChild(child: FakeNode): FakeNode {
    const idx = this.childNodes.indexOf(child);
    if (idx !== -1) {
      this.childNodes.splice(idx, 1);
      child.parentNode = null;
    }
    return child;
  }

  get textContent(): string {
    return this.childNodes.map((c) => c.textContent).join("");
  }

  set textContent(val: string) {
    this.childNodes = [];
    if (val !== "") {
      const textNode = new FakeTextNode(val);
      textNode.parentNode = this;
      this.childNodes.push(textNode);
    }
  }
}

export class FakeTextNode extends FakeNode {
  override nodeType = 3;
  text: string;

  constructor(text: string) {
    super();
    this.text = text;
  }

  override get textContent(): string {
    return this.text;
  }

  override set textContent(val: string) {
    this.text = val;
  }
}

export class FakeClassList {
  private classes = new Set<string>();

  add(...tokens: string[]): void {
    for (const t of tokens) {
      if (t) {
        for (const part of t.trim().split(/\s+/)) {
          if (part) this.classes.add(part);
        }
      }
    }
  }

  remove(...tokens: string[]): void {
    for (const t of tokens) {
      if (t) this.classes.delete(t);
    }
  }

  contains(token: string): boolean {
    return this.classes.has(token);
  }

  toString(): string {
    return Array.from(this.classes).join(" ");
  }
}

export class FakeElement extends FakeNode {
  tagName: string;
  namespaceURI?: string;
  attributes = new Map<string, string>();
  classList = new FakeClassList();
  style: {
    [key: string]: unknown;
    setProperty?: (k: string, v: string) => void;
  } = {
    setProperty: (k: string, v: string) => {
      (this.style as Record<string, unknown>)[k] = v;
    },
  };

  private listeners = new Map<string, Array<(e: unknown) => void>>();

  constructor(tagName: string, namespaceURI?: string) {
    super();
    this.tagName = tagName.toUpperCase();
    this.namespaceURI = namespaceURI;
  }

  setAttribute(name: string, value: string): void {
    this.attributes.set(name.toLowerCase(), String(value));
    if (name.toLowerCase() === "class") {
      this.classList.add(value);
    }
  }

  getAttribute(name: string): string | null {
    return this.attributes.get(name.toLowerCase()) ?? null;
  }

  removeAttribute(name: string): void {
    this.attributes.delete(name.toLowerCase());
  }

  hasAttribute(name: string): boolean {
    return this.attributes.has(name.toLowerCase());
  }

  addEventListener(type: string, listener: (e: unknown) => void): void {
    const list = this.listeners.get(type) ?? [];
    list.push(listener);
    this.listeners.set(type, list);
  }

  dispatchEvent(event: { type?: string }): boolean {
    const type = event.type ?? "";
    const list = this.listeners.get(type) ?? [];
    for (const fn of list) {
      fn(event);
    }
    return true;
  }

  focus(): void {}

  closest(selector: string): FakeElement | null {
    if (selector.startsWith(".")) {
      const cls = selector.slice(1);
      if (this.classList.contains(cls)) return this;
    }
    return this.parentNode instanceof FakeElement ? this.parentNode.closest(selector) : null;
  }

  querySelector(selector: string): FakeElement | null {
    for (const child of this.childNodes) {
      if (child instanceof FakeElement) {
        if (matchesSelector(child, selector)) return child;
        const found = child.querySelector(selector);
        if (found) return found;
      }
    }
    return null;
  }

  querySelectorAll(selector: string): FakeElement[] {
    const results: FakeElement[] = [];
    for (const child of this.childNodes) {
      if (child instanceof FakeElement) {
        if (matchesSelector(child, selector)) results.push(child);
        results.push(...child.querySelectorAll(selector));
      }
    }
    return results;
  }
}

function matchesSelector(el: FakeElement, sel: string): boolean {
  if (sel.startsWith("#")) {
    return el.getAttribute("id") === sel.slice(1);
  }
  if (sel.startsWith(".")) {
    return el.classList.contains(sel.slice(1));
  }
  if (sel.startsWith("[") && sel.endsWith("]")) {
    const attr = sel.slice(1, -1);
    return el.hasAttribute(attr);
  }
  return el.tagName.toLowerCase() === sel.toLowerCase();
}

export class FakeDocument {
  body: FakeElement = new FakeElement("body");
  readyState = "complete";

  createElement(tag: string): FakeElement {
    return new FakeElement(tag);
  }

  createElementNS(ns: string, tag: string): FakeElement {
    return new FakeElement(tag, ns);
  }

  createTextNode(text: string): FakeTextNode {
    return new FakeTextNode(text);
  }

  querySelector(sel: string): FakeElement | null {
    return this.body.querySelector(sel);
  }

  querySelectorAll(sel: string): FakeElement[] {
    return this.body.querySelectorAll(sel);
  }

  addEventListener(): void {}
}

export function setupFakeDOM(): {
  document: FakeDocument;
  cleanup: () => void;
} {
  const fakeDoc = new FakeDocument();
  const originalDoc = (globalThis as unknown as { document?: unknown }).document;
  const originalNode = (globalThis as unknown as { Node?: unknown }).Node;
  const originalRaf = (globalThis as unknown as { requestAnimationFrame?: unknown }).requestAnimationFrame;
  const originalWindow = (globalThis as unknown as { window?: unknown }).window;

  const fakeWindow = {
    matchMedia: () => ({ matches: false }),
    addEventListener: () => {},
    removeEventListener: () => {},
  };

  (globalThis as unknown as { document: unknown }).document = fakeDoc;
  (globalThis as unknown as { Node: unknown }).Node = FakeNode;
  (globalThis as unknown as { window: unknown }).window = fakeWindow;
  (globalThis as unknown as { requestAnimationFrame: unknown }).requestAnimationFrame = (fn: () => void) => {
    fn();
    return 1;
  };

  return {
    document: fakeDoc,
    cleanup: () => {
      (globalThis as unknown as { document: unknown }).document = originalDoc;
      (globalThis as unknown as { Node: unknown }).Node = originalNode;
      (globalThis as unknown as { window: unknown }).window = originalWindow;
      (globalThis as unknown as { requestAnimationFrame: unknown }).requestAnimationFrame = originalRaf;
    },
  };
}
