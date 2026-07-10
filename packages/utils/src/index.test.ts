import { afterEach, describe, expect, test, vi } from "vitest";
import {
  camelizeKebabCase,
  defineElement,
  isKebabCase,
  kebabize,
} from "./index";

describe("kebabize", () => {
  test("converts camelCase to kebab-case", () => {
    expect(kebabize("camelCase")).toBe("camel-case");
  });

  test("converts multi-word camelCase to kebab-case", () => {
    expect(kebabize("ariaColIndex")).toBe("aria-col-index");
  });

  test("leaves single lowercase words unchanged", () => {
    expect(kebabize("word")).toBe("word");
  });

  test("handles consecutive uppercase letters as a single group", () => {
    expect(kebabize("URLValue")).toBe("url-value");
  });

  test("returns an empty string for an empty input", () => {
    expect(kebabize("")).toBe("");
  });
});

describe("isKebabCase", () => {
  test("accepts kebab-case strings", () => {
    expect(isKebabCase("kebab-case")).toBe(true);
  });

  test("accepts a single lowercase word", () => {
    expect(isKebabCase("word")).toBe(true);
  });

  test("accepts digits after the leading letter", () => {
    expect(isKebabCase("heading2")).toBe(true);
  });

  test("accepts digits within a kebab segment", () => {
    expect(isKebabCase("col-2")).toBe(true);
  });

  test("accepts digits mixed into a compound attribute name", () => {
    expect(isKebabCase("aria-colindex2")).toBe(true);
  });

  test("rejects strings starting with a digit", () => {
    expect(isKebabCase("2fast")).toBe(false);
  });

  test("rejects leading dashes (e.g. CSS custom properties)", () => {
    expect(isKebabCase("--css-variable")).toBe(false);
  });

  test("rejects camelCase strings", () => {
    expect(isKebabCase("camelCase")).toBe(false);
  });

  test("rejects an empty string", () => {
    expect(isKebabCase("")).toBe(false);
  });
});

describe("camelizeKebabCase", () => {
  test("converts kebab-case to camelCase", () => {
    expect(camelizeKebabCase("kebab-case")).toBe("kebabCase");
  });

  test("leaves single lowercase words unchanged", () => {
    expect(camelizeKebabCase("word")).toBe("word");
  });

  test("round-trips with kebabize for multi-word attributes", () => {
    const original = "ariaColIndex";
    expect(camelizeKebabCase(kebabize(original))).toBe(original);
  });

  test("handles digit segments", () => {
    expect(camelizeKebabCase("col-2")).toBe("col2");
  });

  test("round-trips digit segments with kebabize", () => {
    const original = "heading2";
    expect(camelizeKebabCase(kebabize(original))).toBe(original);
  });

  test("returns an empty string for an empty input", () => {
    expect(camelizeKebabCase("")).toBe("");
  });
});

describe("defineElement", () => {
  const makeRegistry = (existing?: unknown) => ({
    get: vi.fn(() => existing),
    define: vi.fn(),
  });

  afterEach(() => {
    // this suite runs in node, where the global does not exist natively
    delete (globalThis as { customElements?: unknown }).customElements;
  });

  test("no-ops when there is no customElements registry (bare node)", () => {
    const ctor = class {};
    expect(() => defineElement("my-el", { element: ctor })).not.toThrow();
  });

  test("registers the component's element constructor", () => {
    const registry = makeRegistry();
    (globalThis as { customElements?: unknown }).customElements = registry;
    const ctor = class {};

    defineElement("my-el", { element: ctor });

    expect(registry.define).toHaveBeenCalledExactlyOnceWith("my-el", ctor);
  });

  test("no-ops when the component has no element constructor (server compile)", () => {
    const registry = makeRegistry();
    (globalThis as { customElements?: unknown }).customElements = registry;

    defineElement("my-el", {});
    defineElement("my-el", null);
    defineElement("my-el", undefined);

    expect(registry.define).not.toHaveBeenCalled();
  });

  test("no-ops when the tag is already registered (first registration wins)", () => {
    const registry = makeRegistry(class {});
    (globalThis as { customElements?: unknown }).customElements = registry;

    defineElement("my-el", { element: class {} });

    expect(registry.define).not.toHaveBeenCalled();
  });
});
