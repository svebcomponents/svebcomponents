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
      tagName,
    );

    const attributes = Array.from(renderer.renderAttributes());

    expect(attributes).toContain(' data-test="value1"');
    expect(attributes).toContain(' aria-label="value2"');
  });

  // TODO: test if attributes are escaped correctly?

  test("sets properties to data property", () => {
    const mockElement = {
      attributes: {},
      attributeChangedCallback: vi.fn(),
      $$d: {},
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
