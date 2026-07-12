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
import { collectResult } from "@lit-labs/ssr/lib/render-result.js";
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
      hashes: { script: [] },
      head: "<style>/* test styles */</style>",
      html: "<style>/* test styles */</style>",
    } as unknown as ReturnType<typeof render>);
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

  test("removes attributes and notifies via attributeChangedCallback", () => {
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
    renderer.removeAttribute("data-test");

    expect(mockElement.attributeChangedCallback).toHaveBeenLastCalledWith(
      "data-test",
      "value1",
      null,
    );
    expect(Array.from(renderer.renderAttributes())).toStrictEqual([
      ' aria-label="value2"',
    ]);
  });

  test("removes attributes case-insensitively", () => {
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
    renderer.removeAttribute("DATA-TEST");

    expect(Array.from(renderer.renderAttributes())).toStrictEqual([]);
  });

  test("removing an absent attribute is a no-op and does not notify", () => {
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

    renderer.removeAttribute("data-test");

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
      ' enabled=""',
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

  test("renderShadow method synchronously prints shadow content including expected content", () => {
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

  test("handles empty render result", async () => {
    mockRender.mockReturnValue(
      Promise.resolve({
        body: "",
        hashes: { script: [] },
        head: "",
        html: "",
      }) as unknown as ReturnType<typeof render>,
    );

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
    const shadowContent = await collectResult(renderResult);

    expect(shadowContent).toEqual("");
  });

  test("renderShadow renders svelte >=5.36 thenable RenderOutput synchronously via its lazy getters", () => {
    // svelte >= 5.36 render() results are *always* thenable, but expose lazy
    // sync `head`/`body` getters for synchronous components.
    const renderOutput = {
      get head() {
        return "<style>/* lazy styles */</style>";
      },
      get body() {
        return "<div>Lazy content</div>";
      },
      then: vi.fn(),
    };
    mockRender.mockReturnValue(
      renderOutput as unknown as ReturnType<typeof render>,
    );

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
    // synchronous consumption must work (this is what collectResultSync does)
    const chunks = Array.from(renderResult);
    expect(chunks.every((chunk) => typeof chunk === "string")).toBe(true);
    expect(chunks.join("")).toBe(
      "<style>/* lazy styles */</style><div>Lazy content</div>",
    );
    // the promise path must not be taken for synchronous components
    expect(renderOutput.then).not.toHaveBeenCalled();
  });

  test("renderShadow falls back to the promise path when sync access throws await_invalid", async () => {
    // simulates a genuinely async component rendered with svelte >= 5.36:
    // sync getters throw `await_invalid`, awaiting resolves.
    const awaitInvalid = new Error(
      "await_invalid\nEncountered asynchronous work while rendering synchronously.\nhttps://svelte.dev/e/await_invalid",
    );
    const renderOutput = {
      get head(): string {
        throw awaitInvalid;
      },
      get body(): string {
        throw awaitInvalid;
      },
      then: (
        onfulfilled: (value: { head: string; body: string }) => unknown,
      ) => {
        return Promise.resolve(
          onfulfilled({
            head: "<style>/* awaited styles */</style>",
            body: "<div>Awaited content</div>",
          }),
        );
      },
    };
    mockRender.mockReturnValue(
      renderOutput as unknown as ReturnType<typeof render>,
    );

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
    const shadowContent = await collectResult(renderResult);

    expect(shadowContent).toBe(
      "<style>/* awaited styles */</style><div>Awaited content</div>",
    );
  });

  test("serializes rich props into the shadow output in hydration-host mode", () => {
    const mockElement = {
      attributes: {},
      attributeChangedCallback: vi.fn(),
      $$d: {},
      $$p_d: {},
    };
    mockClientElementCtor.mockReturnValue(mockElement);
    const mockHost = {};

    const renderer = new SvelteCustomElementRenderer(
      mockSvelteComponent,
      mockClientElementCtor,
      tagName,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mock host component
      mockHost as any,
    );

    renderer.setAttribute("title", "from attribute");
    renderer.setProperty("threadData", { items: [1, 2] });

    const shadow = Array.from(
      renderer.renderShadow({} as RenderInfo) ?? [],
    ).join("");
    expect(shadow).toContain(
      '<script type="application/json" data-svebcomponents-ssr-props>',
    );
    const json = /data-svebcomponents-ssr-props>(.*?)<\/script>/.exec(
      shadow,
    )?.[1];
    expect(JSON.parse(json ?? "")).toEqual({ threadData: { items: [1, 2] } });
    // attribute-provided values are recoverable from the DOM — not serialized
    expect(json).not.toContain("from attribute");
  });

  test("escapes markup-breaking characters in serialized rich props", () => {
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mock host component
      {} as any,
    );
    renderer.setProperty("payload", { html: "</script><img src=x>" });

    const shadow = Array.from(
      renderer.renderShadow({} as RenderInfo) ?? [],
    ).join("");
    // exactly one script element: the payload cannot terminate it early
    expect(shadow.match(/<\/script>/g)).toHaveLength(1);
    expect(shadow).toContain("\\u003C/script>");
  });

  test("does not serialize rich props without a hydration host", () => {
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
    renderer.setProperty("threadData", { items: [] });

    const shadow = Array.from(
      renderer.renderShadow({} as RenderInfo) ?? [],
    ).join("");
    expect(shadow).not.toContain("data-svebcomponents-ssr-props");
  });

  test("renderShadow rethrows genuine render errors from sync getters", () => {
    const renderError = new Error("something exploded inside the component");
    const renderOutput = {
      get head(): string {
        throw renderError;
      },
      get body(): string {
        throw renderError;
      },
      then: vi.fn(),
    };
    mockRender.mockReturnValue(
      renderOutput as unknown as ReturnType<typeof render>,
    );

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
    expect(() => Array.from(renderResult)).toThrow(renderError);
  });

  test("renderShadow resolves async svelte render results", async () => {
    mockRender.mockReturnValue(
      Promise.resolve({
        body: "<div>Async content</div>",
        hashes: { script: [] },
        head: "<style>/* async styles */</style>",
        html: "<style>/* async styles */</style><div>Async content</div>",
      }) as unknown as ReturnType<typeof render>,
    );

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
    const shadowContent = await collectResult(renderResult);

    expect(shadowContent).toContain("<style>/* async styles */</style>");
    expect(shadowContent).toContain("<div>Async content</div>");
  });
});
