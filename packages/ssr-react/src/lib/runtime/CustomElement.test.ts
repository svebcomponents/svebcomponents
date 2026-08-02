import { expect, test, describe, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import "@svebcomponents/ssr";
import { ElementRendererRegistry } from "@svebcomponents/ssr";
import { SvelteCustomElementRenderer } from "@svebcomponents/ssr";

import { CustomElement } from "./CustomElement.js";
import { jsx } from "../jsx-runtime.js";

/**
 * A minimal stand-in for a svelte-compiled server component. Svelte's
 * `render()` calls the component with its renderer, so a plain function that
 * pushes markup exercises the real server renderer without compiling a
 * component or mocking `svelte/server` — which would not apply here anyway,
 * since `@svebcomponents/ssr` is consumed as a built dependency.
 */
const serverComponent = (renderer: { push(value: string): void }) => {
  renderer.push("<p>hello</p>");
};

let tagCounter = 0;
const registerElement = (options: { prepare?: () => void | Promise<void> }) => {
  const tagName = `test-element-${++tagCounter}`;

  // extends the shim's HTMLElement, as svelte's generated custom element
  // class does: the renderer keeps host attributes on the element itself
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

describe("CustomElement", () => {
  test("emits the shadow template as the element's first child", () => {
    const tag = registerElement({});

    const html = renderToStaticMarkup(
      createElement(CustomElement, { tag }, createElement("span", null, "kid")),
    );

    // svelte's server renderer brackets component output in block anchors,
    // so the shadow content is matched rather than compared exactly
    expect(html).toContain(`<${tag}><template shadowrootmode="open">`);
    expect(html).toContain("<p>hello</p>");
    expect(html).toContain(`</template><span>kid</span></${tag}>`);
  });

  test("renders light-dom children alongside the shadow template", () => {
    const tag = registerElement({});

    const html = renderToStaticMarkup(
      createElement(CustomElement, { tag }, createElement("p", { id: "a" })),
    );

    // React refuses raw HTML and children on the same element; putting
    // dangerouslySetInnerHTML on the <template> instead is what makes this work
    expect(html).toContain('</template><p id="a">');
  });

  test("emits incoming props alongside the renderer's attributes", () => {
    const tag = registerElement({});

    const html = renderToStaticMarkup(
      createElement(CustomElement, { tag, title: "hi", count: 5 }),
    );

    expect(html).toContain('title="hi"');
    // a non-kebab/non-string prop has no renderer attribute, but React still
    // serializes it — the client tree carries it too, so hydration matches
    expect(html).toContain('count="5"');
  });

  test("degrades to a bare element for an asynchronous renderer", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const tag = registerElement({ prepare: () => Promise.resolve() });

    const html = renderToStaticMarkup(
      createElement(CustomElement, { tag, title: "hi" }),
    );

    expect(html).toBe(`<${tag} title="hi"></${tag}>`);
    expect(html).not.toContain("<template");
    expect(
      warn.mock.calls.some(([m]) =>
        String(m).includes("renders asynchronously"),
      ),
    ).toBe(true);
    warn.mockRestore();
  });

  test("propagates a genuine render failure", () => {
    class Unregistered extends globalThis.HTMLElement {}
    customElements.define("unregistered-react-element", Unregistered);

    expect(() =>
      renderToStaticMarkup(
        createElement(CustomElement, { tag: "unregistered-react-element" }),
      ),
    ).toThrow(/not found/i);
  });
});

describe("jsx runtime interception", () => {
  test("routes a custom element tag through CustomElement", () => {
    const tag = registerElement({});

    const html = renderToStaticMarkup(jsx(tag as never, { title: "hi" }));

    expect(html).toContain('<template shadowrootmode="open">');
    expect(html).toContain('title="hi"');
  });

  test("leaves plain html elements to react", () => {
    const html = renderToStaticMarkup(
      jsx("div", { children: jsx("span", { children: "hi" }) }),
    );

    expect(html).toBe("<div><span>hi</span></div>");
  });

  test("leaves reserved svg/mathml names to react", () => {
    const html = renderToStaticMarkup(jsx("font-face" as never, {}));

    expect(html).toBe("<font-face></font-face>");
  });

  test("leaves component references to react", () => {
    const Component = () => createElement("em", null, "component");

    const html = renderToStaticMarkup(jsx(Component, {}));

    expect(html).toBe("<em>component</em>");
  });
});
