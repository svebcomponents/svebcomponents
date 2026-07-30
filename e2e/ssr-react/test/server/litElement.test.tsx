import { LitElementRenderer } from "@lit-labs/ssr/lib/lit-element-renderer.js";
import { renderToStaticMarkup } from "react-dom/server";
import { test, expect, beforeAll } from "vitest";

import { ElementRendererRegistry } from "@svebcomponents/ssr";

import "../../src/LitCounter.js";
import LitApp from "../../src/LitApp.js";

/**
 * The React integration must not be svelte-specific. Rendering a plain Lit
 * element through it — with no svebcomponents-built component involved at all
 * — is what proves the wrapper only depends on the `ElementRenderer` contract.
 *
 * One `use()` call covers every LitElement, because `LitElementRenderer`
 * selects its own elements through Lit's static `matchesClass` hook. That is
 * the piece `@lit-labs/ssr-react` does not expose, which is why it cannot
 * render anything but Lit elements.
 */
beforeAll(() => {
  ElementRendererRegistry.use(LitElementRenderer);
});

test("server-renders a Lit element to declarative shadow DOM", () => {
  const html = renderToStaticMarkup(<LitApp label="Lit in React" />);

  expect(html).toContain("<lit-counter");
  expect(html).toContain('<template shadowrootmode="open">');
  expect(html).toContain("Lit in React");
  expect(html).toContain("Count: ");
  expect(html).toContain("4");
});

test("emits the Lit element's styles and hydration markers", () => {
  const html = renderToStaticMarkup(<LitApp label="Styled" />);

  expect(html).toContain("rgb(0, 0, 255)");
  // lit-html part markers, needed for the element to hydrate client-side
  expect(html).toContain("<!--lit-part");
});

test("keeps light-dom children outside the shadow template", () => {
  const html = renderToStaticMarkup(<LitApp label="Slotted" />);

  const shadowEnd = html.indexOf("</template>");
  expect(shadowEnd).toBeGreaterThan(-1);
  expect(html.indexOf('<p id="light-dom">')).toBeGreaterThan(shadowEnd);
});
