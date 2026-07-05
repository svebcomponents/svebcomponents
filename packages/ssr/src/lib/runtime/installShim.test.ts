import { expect, test, describe, afterEach, vi } from "vitest";

// The shim module installs its globals as a side effect at import time, so
// each test needs a fresh module registry (vi.resetModules) and a fresh
// dynamic import to observe the install logic running under different
// pre-existing global states.

describe("installShim", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  test("does not replace a pre-existing customElements registry", async () => {
    const existingCustomElements = {
      get: vi.fn(),
      define: vi.fn(),
      whenDefined: vi.fn(),
    };
    const existingElement = class ExistingElement {};
    const existingHTMLElement = class ExistingHTMLElement {};

    vi.stubGlobal("customElements", existingCustomElements);
    vi.stubGlobal("Element", existingElement);
    vi.stubGlobal("HTMLElement", existingHTMLElement);

    vi.resetModules();
    await import("./installShim");

    expect(globalThis.customElements).toBe(existingCustomElements);
    expect(globalThis.Element).toBe(existingElement);
    expect(globalThis.HTMLElement).toBe(existingHTMLElement);
  });

  test("installs Element, HTMLElement, and customElements when not already defined", async () => {
    vi.stubGlobal("customElements", undefined);
    vi.stubGlobal("Element", undefined);
    vi.stubGlobal("HTMLElement", undefined);

    vi.resetModules();
    await import("./installShim");

    expect(globalThis.customElements).toBeDefined();
    expect(globalThis.Element).toBeDefined();
    expect(globalThis.HTMLElement).toBeDefined();
  });

  test("installs globals independently when only some are already present", async () => {
    const existingCustomElements = {
      get: vi.fn(),
      define: vi.fn(),
      whenDefined: vi.fn(),
    };

    vi.stubGlobal("customElements", existingCustomElements);
    vi.stubGlobal("Element", undefined);
    vi.stubGlobal("HTMLElement", undefined);

    vi.resetModules();
    await import("./installShim");

    expect(globalThis.customElements).toBe(existingCustomElements);
    expect(globalThis.Element).toBeDefined();
    expect(globalThis.HTMLElement).toBeDefined();
  });
});
