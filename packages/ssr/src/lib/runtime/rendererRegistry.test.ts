import { expect, test, describe, beforeEach, vi } from "vitest";
import { ElementRendererRegistry } from "./rendererRegistry";
import type { ElementRendererCtor } from "./types";

const { mockCustomElements } = vi.hoisted(() => {
  // Mock customElements global
  const mockCustomElements = {
    get: vi.fn(),
    set: vi.fn(),
  };

  // ElementRendererRegistry uses a Map to store renderers, but since it is a private property, we can't clear it from the outside.
  // So we stub "Map" with an AutoClearingMap that automatically clear itself before each test.
  class AutoClearingMap extends Map {
    constructor() {
      super();
      beforeEach(() => this.clear());
    }
  }

  vi.stubGlobal("Map", AutoClearingMap);

  vi.stubGlobal("customElements", mockCustomElements);

  // Mock HTMLElement
  vi.stubGlobal("HTMLElement", class MockHTMLElement {});

  return { mockCustomElements };
});

describe("ElementRendererRegistry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("sets and gets renderer for element class", () => {
    class MockElement {}

    const mockRenderer = class {} as ElementRendererCtor;

    ElementRendererRegistry.set(MockElement, mockRenderer);
    const retrieved = ElementRendererRegistry.get(MockElement);

    expect(retrieved).toBe(mockRenderer);
  });

  test("sets renderer using string tag name", () => {
    const mockElementClass = class {};
    const mockRenderer = class {} as ElementRendererCtor;
    const tagName = "custom-element";

    mockCustomElements.get.mockReturnValue(mockElementClass);

    ElementRendererRegistry.set(tagName, mockRenderer);

    expect(mockCustomElements.get).toHaveBeenCalledWith(tagName);
    expect(ElementRendererRegistry.get(mockElementClass)).toBe(mockRenderer);
  });

  test("throws error when custom element not found by tag name", () => {
    const mockRenderer = class {} as ElementRendererCtor;
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

    const mockRenderer1 = class {} as ElementRendererCtor;
    const mockRenderer2 = class {} as ElementRendererCtor;

    ElementRendererRegistry.set(MockElement1, mockRenderer1);
    ElementRendererRegistry.set(MockElement2, mockRenderer2);

    const allRenderers = ElementRendererRegistry.getAll();

    expect(allRenderers).toHaveLength(2);
    expect(allRenderers).toContain(mockRenderer1);
    expect(allRenderers).toContain(mockRenderer2);
  });

  // tests breaking
  test("returns null when renderer not found", () => {
    class MockElement {}

    const retrieved = ElementRendererRegistry.get(MockElement);

    expect(retrieved).toBeNull();
  });

  test("checks if renderer exists for element", () => {
    class MockElement {}

    const mockRenderer = class {} as ElementRendererCtor;

    expect(ElementRendererRegistry.has(MockElement)).toBe(false);

    ElementRendererRegistry.set(MockElement, mockRenderer);

    expect(ElementRendererRegistry.has(MockElement)).toBe(true);
  });

  test("searches prototype chain for renderer", () => {
    class BaseElement {}
    class ExtendedElement extends BaseElement {}

    const mockRenderer = class {} as ElementRendererCtor;

    ElementRendererRegistry.set(BaseElement, mockRenderer);
    const retrieved = ElementRendererRegistry.get(ExtendedElement);

    expect(retrieved).toBe(mockRenderer);
  });
});

