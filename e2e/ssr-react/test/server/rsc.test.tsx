import { renderToStaticMarkup } from "react-dom/server";
import { test, expect } from "vitest";

// asynchronous element renderers need Svelte's async SSR mode enabled;
// a non-Svelte host has to opt in explicitly
import "@svebcomponents/ssr/enable-async";

import { CustomElement } from "@svebcomponents/ssr-react/rsc";

// the real build artifacts of the shared e2e component package: the browser
// entry defines the custom elements, the /ssr entries register their renderers
import "@svebcomponents/e2e.ssr";
import "@svebcomponents/e2e.ssr/sync";
import "@svebcomponents/e2e.ssr/ssr";
import "@svebcomponents/e2e.ssr/sync/ssr";

test("renders an asynchronous element renderer, unlike the sync wrapper", async () => {
  // simple-component both awaits during render and has an async SsrPrepare
  // hook — the case the sync CustomElement degrades on, and this entry
  // point exists to server-render instead
  const element = await CustomElement({
    tag: "simple-component",
    title: "React RSC",
    count: "5",
    enabled: "",
  });
  const html = renderToStaticMarkup(element);

  expect(html).toContain('<template shadowrootmode="open">');
  expect(html).toContain('<p id="async-label">Async: resolved</p>');
  expect(html).toContain(
    '<p id="prepared">Prepared: adjacent server module</p>',
  );
});

test("propagates a genuine render failure instead of resolving", async () => {
  class Unregistered extends globalThis.HTMLElement {}
  customElements.define("unregistered-rsc-element", Unregistered);

  await expect(
    CustomElement({ tag: "unregistered-rsc-element" }),
  ).rejects.toThrow(/not found/i);
});
