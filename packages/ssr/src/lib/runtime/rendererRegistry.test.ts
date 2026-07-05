import { expect, test, describe, beforeEach, vi } from "vitest";
import { createElementRendererRegistry } from "./rendererRegistry";
import type { ElementRendererCtor } from "./types";

const { mockCustomElements } = vi.hoisted(() => {
  // Mock customElements global
  const mockCustomElements = {
    get: vi.fn(),
    set: vi.fn(),
  };

  vi.stubGlobal("customElements", mockCustomElements);

  // Mock HTMLElement
  vi.stubGlobal("HTMLElement", class MockHTMLElement {});

  return { mockCustomElements };
});

describe("ElementRendererRegistry", () => {
  // Create a fresh registry instance for each test instead of relying on the
  // shared global singleton, so tests don't leak state into one another.
  let ElementRendererRegistry: ReturnType<typeof createElementRendererRegistry>;

  beforeEach(() => {
    vi.clearAllMocks();
    ElementRendererRegistry = createElementRendererRegistry();
  });

  test("sets and gets renderer for element class", () => {
    class MockElement {}

    const mockRenderer = class {
      constructor(_tagName: string) {}
    } as ElementRendererCtor;

    ElementRendererRegistry.set(MockElement, mockRenderer);
    const retrieved = ElementRendererRegistry.get(MockElement);

    expect(retrieved).toBe(mockRenderer);
  });

  test("sets renderer using string tag name", () => {
    const mockElementClass = class {};
    const mockRenderer = class {
      constructor(_tagName: string) {}
    } as ElementRendererCtor;
    const tagName = "custom-element";

    mockCustomElements.get.mockReturnValue(mockElementClass);

    ElementRendererRegistry.set(tagName, mockRenderer);

    expect(mockCustomElements.get).toHaveBeenCalledWith(tagName);
    expect(ElementRendererRegistry.get(mockElementClass)).toBe(mockRenderer);
  });

  test("throws error when custom element not found by tag name", () => {
    const mockRenderer = class {
      constructor(_tagName: string) {}
    } as ElementRendererCtor;
    const tagName = "non-existent-element";

    mockCustomElements.get.mockReturnValue(undefined);

    expect(() => {
      ElementRendererRegistry.set(tagName, mockRenderer);
    }).toThrow(
      "Could not access custom element constructor for tag: non-existent-element",
    );
  });

  test("returns all registered renderers", () => {
    class MockElement1 {}
    class MockElement2 {}

    const mockRenderer1 = class {
      constructor(_tagName: string) {}
    } as ElementRendererCtor;
    const mockRenderer2 = class {
      constructor(_tagName: string) {}
    } as ElementRendererCtor;

    ElementRendererRegistry.set(MockElement1, mockRenderer1);
    ElementRendererRegistry.set(MockElement2, mockRenderer2);

    const allRenderers = ElementRendererRegistry.getAll();

    expect(allRenderers).toHaveLength(2);
    expect(allRenderers).toContain(mockRenderer1);
    expect(allRenderers).toContain(mockRenderer2);
  });

  test("returns null when renderer not found", () => {
    class MockElement {}

    const retrieved = ElementRendererRegistry.get(MockElement);

    expect(retrieved).toBeNull();
  });

  test("checks if renderer exists for element", () => {
    class MockElement {}

    const mockRenderer = class {
      constructor(_tagName: string) {}
    } as ElementRendererCtor;

    expect(ElementRendererRegistry.has(MockElement)).toBe(false);

    ElementRendererRegistry.set(MockElement, mockRenderer);

    expect(ElementRendererRegistry.has(MockElement)).toBe(true);
  });

  test("searches prototype chain for renderer", () => {
    class BaseElement {}
    class ExtendedElement extends BaseElement {}

    const mockRenderer = class {
      constructor(_tagName: string) {}
    } as ElementRendererCtor;

    ElementRendererRegistry.set(BaseElement, mockRenderer);
    const retrieved = ElementRendererRegistry.get(ExtendedElement);

    expect(retrieved).toBe(mockRenderer);
  });

  test("has() searches prototype chain for renderer registered on base class", () => {
    class BaseElement {}
    class ExtendedElement extends BaseElement {}

    const mockRenderer = class {
      constructor(_tagName: string) {}
    } as ElementRendererCtor;

    ElementRendererRegistry.set(BaseElement, mockRenderer);

    expect(ElementRendererRegistry.has(ExtendedElement)).toBe(true);
  });

  test("has() returns false for unregistered classes", () => {
    class UnregisteredBase {}
    class UnregisteredExtended extends UnregisteredBase {}

    expect(ElementRendererRegistry.has(UnregisteredExtended)).toBe(false);
  });
});
