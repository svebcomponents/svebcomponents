import { LitElementRenderer } from "@lit-labs/ssr/lib/lit-element-renderer.js";
import { createSSRApp } from "vue";
import { renderToString } from "vue/server-renderer";
import { test, expect, beforeAll } from "vitest";

import { ElementRendererRegistry } from "@svebcomponents/ssr";
import { svebcomponents } from "@svebcomponents/ssr-vue";

import "../../src/LitCounter.js";
import LitApp from "../../src/LitApp.vue";

/**
 * The Vue integration must not be svelte-specific. Rendering a plain Lit
 * element through it — with no svebcomponents-built component involved at all
 * — is what proves the wrapper only depends on the `ElementRenderer` contract.
 *
 * One `use()` call covers every LitElement, because `LitElementRenderer`
 * selects its own elements through Lit's static `matchesClass` hook.
 */
beforeAll(() => {
  ElementRendererRegistry.use(LitElementRenderer);
});

const renderApp = async (props: Record<string, unknown>) => {
  const app = createSSRApp(LitApp as never, props);
  app.use(svebcomponents());
  return renderToString(app);
};

test("server-renders a Lit element to declarative shadow DOM", async () => {
  const html = await renderApp({ label: "Lit in Vue" });

  expect(html).toContain("<lit-counter");
  expect(html).toContain('<template shadowrootmode="open">');
  expect(html).toContain("Lit in Vue");
  expect(html).toContain("Count: ");
  expect(html).toContain("4");
});

test("emits the Lit element's styles and hydration markers", async () => {
  const html = await renderApp({ label: "Styled" });

  expect(html).toContain("rgb(0, 0, 255)");
  // lit-html part markers, needed for the element to hydrate client-side
  expect(html).toContain("<!--lit-part");
});

test("keeps light-dom children outside the shadow template", async () => {
  const html = await renderApp({ label: "Slotted" });

  const shadowEnd = html.indexOf("</template>");
  expect(shadowEnd).toBeGreaterThan(-1);
  expect(html.indexOf('<p id="light-dom">')).toBeGreaterThan(shadowEnd);
});
