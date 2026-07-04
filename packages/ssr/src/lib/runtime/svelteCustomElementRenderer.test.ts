import {
  expect,
  test,
  describe,
  vi,
  beforeEach,
  assert,
  type MockedFunction,
} from "vitest";
import { SvelteCustomElementRenderer } from "./svelteCustomElementRenderer";
import { render } from "svelte/server";
import type { RenderInfo } from "@lit-labs/ssr";
import { SvelteCustomElementPropType } from "./html";

// Mock svelte/server
vi.mock("svelte/server", () => ({
  render: vi.fn(),
}));

const mockRender = render as unknown as MockedFunction<typeof render>;

describe("SvelteCustomElementRenderer", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- this is just a mock
  let mockSvelteComponent: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- this is just a mock
  let mockClientElementCtor: any;
  const tagName = "test-element";

  beforeEach(() => {
    vi.clearAllMocks();

    mockSvelteComponent = {};

    mockClientElementCtor = vi.fn().mockImplementation(() => ({
      attributes: {},
      attributeChangedCallback: vi.fn(),
      $$d: {},
      $$p_d: {},
      $$c: mockSvelteComponent,
    }));

    mockRender.mockReturnValue({
      body: "<div>Test content</div>",
      head: "<style>/* test styles */</style>",
      html: "<style>/* test styles */</style>",
    });
  });

  test("creates renderer with correct tag name", () => {
    const renderer = new SvelteCustomElementRenderer(
      mockSvelteComponent,
      mockClientElementCtor,
      tagName,
    );

    expect(renderer.tagName).toBe(tagName);
  });

  test("instantiates client element constructor", () => {
    new SvelteCustomElementRenderer(
      mockSvelteComponent,
      mockClientElementCtor,
      tagName,
    );

    expect(mockClientElementCtor).toHaveBeenCalledOnce();
  });

  test("sets attributes via attributeChangedCallback for string values", () => {
    const mockElement = {
      attributes: {},
      attributeChangedCallback: vi.fn(),
      $$d: {},
      $$p_d: {},
    };
    mockClientElementCtor.mockReturnValue(mockElement);

    const renderer = new SvelteCustomElementRenderer(
      mockSvelteComponent,
      mockClientElementCtor,
      tagName,
    );

    renderer.setAttribute("test-attr", "test-value");

    expect(mockElement.attributeChangedCallback).toHaveBeenCalledWith(
      "test-attr",
      "test-value",
      "test-value",
    );
  });

  test("sets non-string attributes directly on $$d without calling attribute changed callback", () => {
    const mockElement = {
      attributes: {},
      attributeChangedCallback: vi.fn(),
      $$d: {},
      $$p_d: {},
    };
    mockClientElementCtor.mockReturnValue(mockElement);

    const renderer = new SvelteCustomElementRenderer(
      mockSvelteComponent,
      mockClientElementCtor,
      tagName,
    );

    const complexValue = { foo: "bar" };
    renderer.setAttribute("test-prop", complexValue as unknown as string);

    assert("test-prop" in mockElement.$$d);
    expect(mockElement.$$d["test-prop"]).toBe(complexValue);
    expect(mockElement.attributeChangedCallback).not.toHaveBeenCalled();
  });

  test("renders attributes correctly", () => {
    const mockElement = {
      attributes: {},
      attributeChangedCallback: vi.fn(),
      $$d: {},
      $$p_d: {},
    };
    mockClientElementCtor.mockReturnValue(mockElement);

    const renderer = new SvelteCustomElementRenderer(
      mockSvelteComponent,
      mockClientElementCtor,
      tagName,
    );

    renderer.setAttribute("data-test", "value1");
    renderer.setAttribute("aria-label", "value2");
    const attributes = Array.from(renderer.renderAttributes());

    expect(attributes).toContain(' data-test="value1"');
    expect(attributes).toContain(' aria-label="value2"');
  });

  test("escapes attribute values", () => {
    const mockElement = {
      attributes: {},
      attributeChangedCallback: vi.fn(),
      $$d: {},
      $$p_d: {},
    };
    mockClientElementCtor.mockReturnValue(mockElement);

    const renderer = new SvelteCustomElementRenderer(
      mockSvelteComponent,
      mockClientElementCtor,
      tagName,
    );

    renderer.setAttribute("data-test", `"><img src=x onerror=alert('xss')>`);
    const attributes = Array.from(renderer.renderAttributes());

    expect(attributes).toContain(
      ` data-test="&quot;>&lt;img src=x onerror=alert('xss')>"`,
    );
  });

  test("rejects invalid attribute names", () => {
    const mockElement = {
      attributes: {},
      attributeChangedCallback: vi.fn(),
      $$d: {},
      $$p_d: {},
    };
    mockClientElementCtor.mockReturnValue(mockElement);

    const renderer = new SvelteCustomElementRenderer(
      mockSvelteComponent,
      mockClientElementCtor,
      tagName,
    );

    renderer.setAttribute(`data-test" onclick="alert(1)`, "value");

    expect(() => Array.from(renderer.renderAttributes())).toThrow(
      'Invalid SSR attribute name: data-test" onclick="alert(1)',
    );
  });

  test("reflects configured properties to attributes", () => {
    const mockElement = {
      attributes: {},
      attributeChangedCallback: vi.fn(),
      $$d: {},
      $$p_d: {
        enabled: {
          attribute: "enabled",
          reflect: true,
          type: SvelteCustomElementPropType.Boolean,
        },
        count: {
          attribute: "count",
          reflect: true,
          type: SvelteCustomElementPropType.Number,
        },
      },
    };
    mockClientElementCtor.mockReturnValue(mockElement);

    const renderer = new SvelteCustomElementRenderer(
      mockSvelteComponent,
      mockClientElementCtor,
      tagName,
    );

    renderer.setProperty("enabled", true);
    renderer.setProperty("count", 5);

    expect(Array.from(renderer.renderAttributes())).toStrictEqual([
      " enabled",
      ' count="5"',
    ]);
  });

  test("sets properties to data property", () => {
    const mockElement = {
      attributes: {},
      attributeChangedCallback: vi.fn(),
      $$d: {},
      $$p_d: {},
    };
    mockClientElementCtor.mockReturnValue(mockElement);

    const renderer = new SvelteCustomElementRenderer(
      mockSvelteComponent,
      mockClientElementCtor,
      tagName,
    );

    const testValue = { complex: true };
    renderer.setProperty("testProp", testValue);
    assert("testProp" in mockElement.$$d);

    expect(mockElement.$$d.testProp).toBe(testValue);
  });

  test("renderShadow method prints shadow content including expected content", () => {
    const mockElement = {
      attributes: {},
      attributeChangedCallback: vi.fn(),
      $$d: { prop1: "value1", prop2: "value2" },
      $$p_d: {},
    };
    mockClientElementCtor.mockReturnValue(mockElement);

    const renderer = new SvelteCustomElementRenderer(
      mockSvelteComponent,
      mockClientElementCtor,
      tagName,
    );

    const renderResult = renderer.renderShadow({} as RenderInfo);
    assert(renderResult);
    const shadowContent = Array.from(renderResult).join("");

    expect(mockRender).toHaveBeenCalledWith(mockSvelteComponent, {
      props: mockElement.$$d,
    });

    expect(shadowContent).toContain("<style>/* test styles */</style>");
    expect(shadowContent).toContain("<div>Test content</div>");
  });

  test("renderShadow drops non-style svelte:head content from the shadow root", () => {
    // Mirrors what Svelte's server render() emits in `head` for a component
    // using <svelte:head> when compiled with css: "injected": hydration
    // markers, document metadata, and the injected component style.
    mockRender.mockReturnValue({
      body: '<!--[--><div class="both svelte-abc">both content</div><!--]-->',
      head: '<!--[--><meta name="description" content="desc"> <link rel="canonical" href="https://example.com"><!--]--><title>Page Title</title><style id="svelte-abc">.both.svelte-abc {color:blue;}</style>',
      html: "",
    });

    const renderer = new SvelteCustomElementRenderer(
      mockSvelteComponent,
      mockClientElementCtor,
      tagName,
    );

    const renderResult = renderer.renderShadow({} as RenderInfo);
    assert(renderResult);
    const shadowContent = Array.from(renderResult).join("");

    expect(shadowContent).toContain(
      '<style id="svelte-abc">.both.svelte-abc {color:blue;}</style>',
    );
    expect(shadowContent).toContain(
      '<div class="both svelte-abc">both content</div>',
    );
    expect(shadowContent).not.toContain("<title>");
    expect(shadowContent).not.toContain("<meta");
    expect(shadowContent).not.toContain('rel="canonical"');
  });

  test("renderShadow keeps stylesheet links but drops other head links", () => {
    mockRender.mockReturnValue({
      body: "<div>content</div>",
      head: '<link rel="stylesheet" href="/theme.css"><link rel="preconnect" href="https://example.com"><link rel="icon" href="/favicon.ico">',
      html: "",
    });

    const renderer = new SvelteCustomElementRenderer(
      mockSvelteComponent,
      mockClientElementCtor,
      tagName,
    );

    const renderResult = renderer.renderShadow({} as RenderInfo);
    assert(renderResult);
    const shadowContent = Array.from(renderResult).join("");

    expect(shadowContent).toContain(
      '<link rel="stylesheet" href="/theme.css">',
    );
    expect(shadowContent).not.toContain('rel="preconnect"');
    expect(shadowContent).not.toContain('rel="icon"');
  });

  test("handles empty render result", () => {
    mockRender.mockReturnValue({
      body: "",
      head: "",
      html: "",
    });

    const mockElement = {
      attributes: {},
      attributeChangedCallback: vi.fn(),
      $$d: {},
      $$p_d: {},
    };
    mockClientElementCtor.mockReturnValue(mockElement);

    const renderer = new SvelteCustomElementRenderer(
      mockSvelteComponent,
      mockClientElementCtor,
      tagName,
    );

    const renderResult = renderer.renderShadow({} as RenderInfo);
    assert(renderResult);
    const shadowContent = Array.from(renderResult).join("");

    expect(shadowContent).toEqual("");
  });
});
