import { expect, test, describe, vi, beforeEach } from "vitest";
import { SvelteCustomElementRenderer } from "./svelteCustomElementRenderer";
import { render } from "svelte/server";

// Mock svelte/server
vi.mock("svelte/server", () => ({
  render: vi.fn(),
}));

// Mock @lit-labs/ssr
vi.mock("@lit-labs/ssr", () => ({
  ElementRenderer: class ElementRenderer {
    constructor(public tagName: string) {}
    setAttribute(_name: string, _value: string) {}
    setProperty(_name: string, _value: unknown) {}
    renderAttributes() { return []; }
    renderShadow() { return undefined; }
  },
}));

const mockRender = render as typeof render & { mockReturnValue: (value: any) => void };

describe("SvelteCustomElementRenderer", () => {
  let mockSvelteComponent: any;
  let mockClientElementCtor: any;
  const tagName = "test-element";

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockSvelteComponent = {};
    
    mockClientElementCtor = vi.fn().mockImplementation(() => ({
      attributes: {},
      attributeChangedCallback: vi.fn(),
      $$d: {},
      $$c: mockSvelteComponent,
    }));

    mockRender.mockReturnValue({
      body: "<div>Test content</div>",
      head: "<style>/* test styles */</style>",
    });
  });

  test("creates renderer with correct tag name", () => {
    const renderer = new SvelteCustomElementRenderer(
      mockSvelteComponent,
      mockClientElementCtor,
      tagName
    );
    
    expect(renderer.tagName).toBe(tagName);
    expect(mockClientElementCtor).toHaveBeenCalled();
  });

  test("sets attributes via attributeChangedCallback for string values", () => {
    const mockElement = {
      attributes: {},
      attributeChangedCallback: vi.fn(),
      $$d: {},
    };
    mockClientElementCtor.mockReturnValue(mockElement);
    
    const renderer = new SvelteCustomElementRenderer(
      mockSvelteComponent,
      mockClientElementCtor,
      tagName
    );
    
    renderer.setAttribute("test-attr", "test-value");
    
    expect(mockElement.attributeChangedCallback).toHaveBeenCalledWith(
      "test-attr",
      "test-value",
      "test-value"
    );
  });

  test("sets non-string attributes directly on $$d", () => {
    const mockElement = {
      attributes: {},
      attributeChangedCallback: vi.fn(),
      $$d: {},
    };
    mockClientElementCtor.mockReturnValue(mockElement);
    
    const renderer = new SvelteCustomElementRenderer(
      mockSvelteComponent,
      mockClientElementCtor,
      tagName
    );
    
    const complexValue = { foo: "bar" };
    renderer.setAttribute("test-prop", complexValue as any);
    
    expect(mockElement.$$d["test-prop"]).toBe(complexValue);
  });

  test("renders attributes correctly", () => {
    const mockElement = {
      attributes: {
        "data-test": "value1",
        "aria-label": "value2",
      },
      attributeChangedCallback: vi.fn(),
      $$d: {},
    };
    mockClientElementCtor.mockReturnValue(mockElement);
    
    const renderer = new SvelteCustomElementRenderer(
      mockSvelteComponent,
      mockClientElementCtor,
      tagName
    );
    
    const attributes = Array.from(renderer.renderAttributes());
    
    expect(attributes).toContain(' data-test="value1"');
    expect(attributes).toContain(' aria-label="value2"');
  });

  test("sets properties on $$d", () => {
    const mockElement = {
      attributes: {},
      attributeChangedCallback: vi.fn(),
      $$d: {},
    };
    mockClientElementCtor.mockReturnValue(mockElement);
    
    const renderer = new SvelteCustomElementRenderer(
      mockSvelteComponent,
      mockClientElementCtor,
      tagName
    );
    
    const testValue = { complex: true };
    renderer.setProperty("testProp", testValue);
    
    expect(mockElement.$$d.testProp).toBe(testValue);
  });

  test("renders shadow DOM content using Svelte server render", () => {
    const mockElement = {
      attributes: {},
      attributeChangedCallback: vi.fn(),
      $$d: { prop1: "value1", prop2: "value2" },
    };
    mockClientElementCtor.mockReturnValue(mockElement);
    
    const renderer = new SvelteCustomElementRenderer(
      mockSvelteComponent,
      mockClientElementCtor,
      tagName
    );
    
    const shadowContent = Array.from(renderer.renderShadow({} as any));
    
    expect(mockRender).toHaveBeenCalledWith(mockSvelteComponent, {
      props: mockElement.$$d,
    });
    
    expect(shadowContent).toContain("<style>/* test styles */</style>");
    expect(shadowContent).toContain("<div>Test content</div>");
  });

  test("handles empty render result", () => {
    mockRender.mockReturnValue({
      body: "",
      head: "",
    });
    
    const mockElement = {
      attributes: {},
      attributeChangedCallback: vi.fn(),
      $$d: {},
    };
    mockClientElementCtor.mockReturnValue(mockElement);
    
    const renderer = new SvelteCustomElementRenderer(
      mockSvelteComponent,
      mockClientElementCtor,
      tagName
    );
    
    const shadowContent = Array.from(renderer.renderShadow({} as any));
    
    expect(shadowContent).toEqual(["", ""]);
  });
});