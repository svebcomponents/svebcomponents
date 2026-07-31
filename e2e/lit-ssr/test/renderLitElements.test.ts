import { LitElementRenderer } from "@lit-labs/ssr/lib/lit-element-renderer.js";
import { test, expect, beforeAll } from "vitest";

import {
  ElementRendererRegistry,
  renderCustomElementSync,
  renderCustomElement,
} from "@svebcomponents/ssr";

// defining the element requires the DOM shim, which importing the package above
// installs
import "../src/LitCounter.js";

/**
 * The mirror image of `litCompatibility.test.ts`.
 *
 * That suite renders svebcomponents elements through Lit's pipeline. This one
 * renders a *Lit* element through svebcomponents' pipeline — which is the
 * stronger claim, because it means the host integrations (Svelte, Vue, React)
 * are not svelte-specific machinery that happens to be reusable, but a generic
 * custom-element SSR layer that any `ElementRenderer` plugs into.
 *
 * One registration covers every LitElement in the app, because
 * `LitElementRenderer` selects its own elements through Lit's static
 * `matchesClass` hook rather than being bound to a tag.
 */
beforeAll(() => {
  ElementRendererRegistry.use(LitElementRenderer);
});

test("renders a Lit element to declarative shadow DOM", () => {
  const rendered = renderCustomElementSync("lit-counter", {
    label: "Lit via svebcomponents",
    count: 3,
  });

  expect(rendered.shadowTemplate).toContain('<template shadowrootmode="open">');
  expect(rendered.shadowTemplate).toContain("Lit via svebcomponents");
  expect(rendered.shadowTemplate).toContain("Count: ");
  expect(rendered.shadowTemplate).toContain("3");
});

test("emits the Lit element's styles into the shadow root", () => {
  const rendered = renderCustomElementSync("lit-counter", { label: "Styled" });

  expect(rendered.shadowTemplate).toContain("<style>");
  expect(rendered.shadowTemplate).toContain("rgb(0, 0, 255)");
});

test("emits Lit's hydration markers so the element can hydrate", () => {
  const rendered = renderCustomElementSync("lit-counter", { label: "Hydrate" });

  // lit-html's part markers are what `@lit-labs/ssr-client` needs on the
  // client to hydrate rather than re-render
  expect(rendered.shadowTemplate).toContain("<!--lit-part");
});

test("applies string props as host attributes and rich props as properties", () => {
  const rendered = renderCustomElementSync("lit-counter", {
    label: "Attributes",
    "data-testid": "counter",
  });

  // kebab-case string props become host attributes
  expect(rendered.attributes["data-testid"]).toBe("counter");
  // and the property reached the element, since it rendered
  expect(rendered.shadowTemplate).toContain("Attributes");
});

test("renders a Lit element through the async path too", async () => {
  const rendered = await renderCustomElement("lit-counter", {
    label: "Async path",
    count: 7,
  });

  expect(rendered.shadowTemplate).toContain("Async path");
  expect(rendered.shadowTemplate).toContain("7");
});

test("an explicit registration still wins over a matchesClass renderer", () => {
  // apps must be able to override the renderer for one specific element even
  // when a family-wide renderer would otherwise claim it
  class OverrideRenderer extends LitElementRenderer {
    override renderShadow() {
      return ["<p>overridden</p>"];
    }
  }

  ElementRendererRegistry.set("lit-counter", OverrideRenderer as never);
  try {
    const rendered = renderCustomElementSync("lit-counter", { label: "x" });
    expect(rendered.shadowTemplate).toContain("<p>overridden</p>");
  } finally {
    ElementRendererRegistry.set("lit-counter", LitElementRenderer as never);
  }
});
