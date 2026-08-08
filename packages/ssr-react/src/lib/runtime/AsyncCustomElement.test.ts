import { expect, test, describe, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import "@svebcomponents/ssr";
import { ElementRendererRegistry } from "@svebcomponents/ssr";
import { SvelteCustomElementRenderer } from "@svebcomponents/ssr";

import { CustomElement } from "./AsyncCustomElement.js";

/**
 * A minimal stand-in for a svelte-compiled server component. `prepare` mimics
 * an async `SsrPrepare` hook — the case the sync wrapper cannot handle and
 * this one exists to cover.
 */
const serverComponent = (renderer: { push(value: string): void }) => {
  renderer.push("<p>hello</p>");
};

let tagCounter = 0;
const registerElement = (options: { prepare?: () => void | Promise<void> }) => {
  const tagName = `test-async-element-${++tagCounter}`;

  class ClientElement extends globalThis.HTMLElement {
    attributeChangedCallback = vi.fn();
    $$d: Record<string, unknown> = {};
    $$p_d: Record<string, never> = {};
    $$c = {} as never;
  }

  class Renderer extends SvelteCustomElementRenderer {
    constructor(tag: string) {
      super(
        serverComponent as never,
        ClientElement as never,
        tag,
        undefined,
        options.prepare,
      );
    }
  }

  class HostElement extends globalThis.HTMLElement {}
  customElements.define(tagName, HostElement);
  ElementRendererRegistry.set(tagName, Renderer as never);

  return tagName;
};

describe("CustomElement (RSC)", () => {
  test("emits the shadow template as the element's first child", async () => {
    const tag = registerElement({});

    const element = await CustomElement({
      tag,
      children: createElement("span", null, "kid"),
    });
    const html = renderToStaticMarkup(element);

    expect(html).toContain(`<${tag}><template shadowrootmode="open">`);
    expect(html).toContain("<p>hello</p>");
    expect(html).toContain(`</template><span>kid</span></${tag}>`);
  });

  test("server-renders an element with an asynchronous SsrPrepare hook", async () => {
    const tag = registerElement({ prepare: () => Promise.resolve() });

    const element = await CustomElement({ tag, title: "hi" });
    const html = renderToStaticMarkup(element);

    // unlike the sync wrapper, this does not degrade: the shadow content is
    // present because the RSC entry point can await the renderer
    expect(html).toContain('<template shadowrootmode="open">');
    expect(html).toContain("<p>hello</p>");
    expect(html).toContain('title="hi"');
  });

  test("emits incoming props alongside the renderer's attributes", async () => {
    const tag = registerElement({});

    const element = await CustomElement({ tag, title: "hi", count: 5 });
    const html = renderToStaticMarkup(element);

    expect(html).toContain('title="hi"');
    expect(html).toContain('count="5"');
  });

  test("propagates a genuine render failure", async () => {
    class Unregistered extends globalThis.HTMLElement {}
    customElements.define("unregistered-rsc-element", Unregistered);

    await expect(
      CustomElement({ tag: "unregistered-rsc-element" }),
    ).rejects.toThrow(/not found/i);
  });
});
