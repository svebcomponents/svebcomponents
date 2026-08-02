import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { test, expect } from "vitest";

// asynchronous element renderers need Svelte's async SSR mode enabled; a
// non-Svelte host has to opt in explicitly
import "@svebcomponents/ssr/enable-async";

// the real build artifacts of the shared e2e component package: the browser
// entry defines the custom elements, the /ssr entries register their renderers
import "@svebcomponents/e2e.ssr";
import "@svebcomponents/e2e.ssr/sync";
import "@svebcomponents/e2e.ssr/ssr";
import "@svebcomponents/e2e.ssr/sync/ssr";

import Page from "../src/Page.astro";
import AsyncPage from "../src/AsyncPage.astro";

/**
 * Astro annotates elements with `data-astro-source-file` / `-loc` in dev,
 * which the container API reproduces (they are stripped from production
 * builds). Assertions therefore match opening tags without their closing
 * `>`.
 */
const render = async (component: unknown, props: Record<string, unknown>) => {
  const container = await AstroContainer.create();
  return container.renderToString(component as never, { props });
};

test("renders a custom element to declarative shadow DOM", async () => {
  const html = await render(Page, { title: "Astro SSR" });

  expect(html).toContain("<sync-component");
  expect(html).toContain('<template shadowrootmode="open"');
  expect(html).toContain(">Astro SSR</h1>");
  expect(html).toContain('<p id="count">Count: number-3</p>');
  expect(html).toContain('<p id="enabled">Enabled: boolean-true</p>');
});

test("emits the shadow template as the element's first child", async () => {
  const html = await render(Page, { title: "Astro SSR" });

  // the parser only adopts a declarative shadow root that comes first; a
  // self-closing <template /> in the wrapper would put the light-dom children
  // inside it instead
  const elementStart = html.indexOf("<sync-component");
  const elementOpenEnd = html.indexOf(">", elementStart) + 1;
  expect(html.slice(elementOpenEnd)).toMatch(/^<template shadowrootmode="open"/);
});

test("keeps light-dom children outside the shadow template", async () => {
  const html = await render(Page, { title: "Astro SSR" });

  const shadowEnd = html.indexOf("</template>");
  expect(shadowEnd).toBeGreaterThan(-1);
  expect(html.indexOf('<p id="light-dom"')).toBeGreaterThan(shadowEnd);
});

test("emits the host attributes the element renderer produced", async () => {
  const html = await render(Page, { title: "Astro SSR" });

  expect(html).toContain('title="Astro SSR"');
  expect(html).toContain('count="3"');
});

test("serializes rich props for the client to hydrate from", async () => {
  const html = await render(Page, { title: "Astro SSR" });

  expect(html).toContain('"note":"rich prop survived"');
});

test("renders an asynchronous element renderer with no async wrapper", async () => {
  // Astro frontmatter is an async module scope, so the wrapper simply awaits
  // the renderer — no sync/async split as in the Svelte integration, and no
  // degradation as in React's
  const html = await render(AsyncPage, { title: "Astro Async" });

  expect(html).toContain('<p id="async-label">Async: resolved</p>');
  expect(html).toContain(
    '<p id="prepared">Prepared: adjacent server module</p>',
  );
});

test("escapes untrusted values rendered into the shadow root", async () => {
  const payload = `"><img src=x onerror=alert(1)>`;
  const html = await render(Page, { title: payload });

  // Inside the shadow root the payload is text, so `<` must be escaped or it
  // would become a real element.
  expect(html).toContain("&lt;img src=x onerror=alert(1)>");

  // On the host attribute Astro escapes the quote rather than the `<`, which
  // is spec-correct: an attribute value is not parsed as markup, so the only
  // way out is closing the quote. Assert that specifically rather than the
  // absence of "<img", which is inert here.
  expect(html).toContain('title="&#34;><img src=x onerror=alert(1)>"');
  expect(html).not.toContain('title=""><img');
});
