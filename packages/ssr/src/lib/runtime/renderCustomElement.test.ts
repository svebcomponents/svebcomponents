import { expect, test, describe, beforeEach, vi } from "vitest";

import "./installShim.js";
import { ElementRendererRegistry } from "./rendererRegistry.js";
import { SvelteCustomElementRenderer } from "./svelteCustomElementRenderer.js";
import {
  renderCustomElement,
  renderCustomElementSync,
} from "./renderCustomElement.js";

import { render } from "svelte/server";

vi.mock("svelte/server", () => ({
  render: vi.fn(),
}));

const mockRender = vi.mocked(render);

/**
 * Registers a custom element + renderer pair under a fresh tag name, so each
 * test is independent of the process-global custom element registry.
 */
let tagCounter = 0;
const registerElement = (options: { prepare?: () => void | Promise<void> }) => {
  const tagName = `test-element-${++tagCounter}`;

  class ClientElement {
    attributes: Record<string, string> = {};
    attributeChangedCallback = vi.fn();
    $$d: Record<string, unknown> = {};
    $$p_d: Record<string, never> = {};
    $$c = {} as never;
  }

  class Renderer extends SvelteCustomElementRenderer {
    constructor(tag: string) {
      super(
        {} as never,
        ClientElement as never,
        tag,
        undefined,
        options.prepare,
      );
    }
  }

  // the shim's registry needs a real constructor to hand back to lookups
  class HostElement extends globalThis.HTMLElement {}
  customElements.define(tagName, HostElement);
  ElementRendererRegistry.set(tagName, Renderer as never);

  return tagName;
};

describe("renderCustomElement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRender.mockReturnValue({
      head: "",
      body: "<p>hello</p>",
    } as unknown as ReturnType<typeof render>);
  });

  test("wraps shadow output in a declarative shadow root template", () => {
    const tagName = registerElement({});

    const { shadowTemplate } = renderCustomElementSync(tagName, {});

    expect(shadowTemplate).toBe(
      '<template shadowrootmode="open"><p>hello</p></template>',
    );
  });

  test("routes string props with kebab-case names to attributes", () => {
    const tagName = registerElement({});

    const { attributes } = renderCustomElementSync(tagName, {
      "data-label": "hi",
    });

    expect(attributes).toEqual({ "data-label": "hi" });
  });

  test("routes non-string and camelCase props to properties", () => {
    const tagName = registerElement({});

    const { attributes } = renderCustomElementSync(tagName, {
      count: 5,
      userName: "ada",
    });

    // properties do not reflect to attributes without a prop definition
    expect(attributes).toEqual({});
    expect(mockRender).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        props: expect.objectContaining({ count: 5, userName: "ada" }),
      }),
    );
  });

  test("does not forward host wrapper plumbing props to the element", () => {
    const tagName = registerElement({});

    renderCustomElementSync(tagName, {
      _tagName: "should-not-leak",
      children: "should-not-leak",
      real: 1,
    });

    const renderOptions = mockRender.mock.calls[0]?.[1] as
      { props?: Record<string, unknown> } | undefined;
    expect(renderOptions?.props).toEqual({ real: 1 });
  });

  test("rejects an invalid custom element tag name", () => {
    expect(() => renderCustomElementSync("notcustom", {})).toThrow(
      /Invalid custom element tag name/,
    );
  });

  test("reports an unregistered element rather than rendering nothing", () => {
    class Unregistered extends globalThis.HTMLElement {}
    customElements.define("unregistered-element", Unregistered);

    expect(() => renderCustomElementSync("unregistered-element", {})).toThrow(
      /renderer for unregistered-element not found/i,
    );
  });

  test("throws from the sync path when the renderer is asynchronous", () => {
    const tagName = registerElement({
      prepare: () => Promise.resolve(),
    });

    // an async SsrPrepare hook makes the shadow stream yield a promise, which
    // the synchronous collector cannot consume
    expect(() => renderCustomElementSync(tagName, {})).toThrow();
  });

  test("awaits an asynchronous renderer on the async path", async () => {
    const tagName = registerElement({
      prepare: () => Promise.resolve(),
    });

    const { shadowTemplate } = await renderCustomElement(tagName, {});

    expect(shadowTemplate).toBe(
      '<template shadowrootmode="open"><p>hello</p></template>',
    );
  });

  test("accepts a synchronous renderer on the async path too", async () => {
    const tagName = registerElement({});

    const { shadowTemplate } = await renderCustomElement(tagName, {});

    expect(shadowTemplate).toBe(
      '<template shadowrootmode="open"><p>hello</p></template>',
    );
  });
});
