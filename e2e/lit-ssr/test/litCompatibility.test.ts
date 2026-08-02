import { render } from "@lit-labs/ssr";
import { collectResult } from "@lit-labs/ssr/lib/render-result.js";
import { html } from "lit";
import { test, expect } from "vitest";

// asynchronous element renderers need svelte's async SSR mode enabled; a
// non-svelte host has to opt in explicitly
import "@svebcomponents/ssr/enable-async";

// the real build artifacts of the shared e2e component package
import "@svebcomponents/e2e.ssr";
import "@svebcomponents/e2e.ssr/sync";
import SimpleComponentRenderer from "@svebcomponents/e2e.ssr/ssr";
import SyncComponentRenderer from "@svebcomponents/e2e.ssr/sync/ssr";

/**
 * These tests drive svebcomponents' element renderers through Lit's *own* SSR
 * pipeline rather than through any svebcomponents host integration.
 *
 * That is the point: a custom element renderer should be agnostic to the
 * framework rendering it, and Lit's `render()` is the reference consumer of
 * the `ElementRenderer` contract. If a renderer needs anything beyond that
 * contract to produce correct output, this suite fails.
 *
 * Note the renderers are passed straight to `elementRenderers` — no adapter,
 * no subclassing. Selection works because the generated entry points
 * implement Lit's static `matchesClass` hook.
 */
const renderThroughLit = (template: ReturnType<typeof html>) =>
  collectResult(
    render(template, {
      elementRenderers: [SyncComponentRenderer, SimpleComponentRenderer],
    }),
  );

test("renders a synchronous custom element to declarative shadow DOM", async () => {
  const result = await renderThroughLit(
    html`<sync-component title="Lit SSR" count="3"></sync-component>`,
  );

  expect(result).toContain("<sync-component");
  expect(result).toContain('shadowrootmode="open"');
  expect(result).toContain(">Lit SSR</h1>");
  expect(result).toContain('<p id="count">Count: number-3</p>');
  expect(result).toContain('<p id="enabled">Enabled: boolean-true</p>');
});

test("emits host attributes through Lit's own attribute rendering", async () => {
  const result = await renderThroughLit(
    html`<sync-component title="Lit SSR" count="3"></sync-component>`,
  );

  // Lit serializes these from `renderer.element.attributes`, so this is what
  // proves the renderer keeps its host attributes on the standard surface
  // rather than in a private store only svebcomponents knows how to read.
  expect(result).toContain('title="Lit SSR"');
  expect(result).toContain('count="3"');
});

test("renders light-dom children outside the shadow root", async () => {
  const result = await renderThroughLit(
    html`<sync-component title="Lit SSR"
      ><p id="light">light</p></sync-component
    >`,
  );

  const shadowEnd = result.indexOf("</template>");
  expect(shadowEnd).toBeGreaterThan(-1);
  expect(result.indexOf('<p id="light">')).toBeGreaterThan(shadowEnd);
});

test("renders an asynchronous element renderer", async () => {
  // simple-component both awaits while rendering and has an async SsrPrepare
  // hook; Lit's pipeline awaits the renderer's thunked RenderResult
  const result = await renderThroughLit(
    html`<simple-component title="Async via lit"></simple-component>`,
  );

  expect(result).toContain('<p id="async-label">Async: resolved</p>');
  expect(result).toContain(
    '<p id="prepared">Prepared: adjacent server module</p>',
  );
});

test("serializes rich props into the shadow output", async () => {
  const result = await renderThroughLit(
    html`<simple-component title="Async via lit"></simple-component>`,
  );

  expect(result).toContain('"prepared":{"source":"adjacent server module"}');
});

test("escapes untrusted attribute values", async () => {
  const payload = `"><img src=x onerror=alert(1)>`;
  const result = await renderThroughLit(
    html`<sync-component title="${payload}"></sync-component>`,
  );

  expect(result).not.toContain("<img");
});

test("falls back to Lit's own renderer for unclaimed elements", async () => {
  // matchesClass must claim only the element it was generated for, or a
  // renderer would hijack unrelated custom elements in the host's tree
  const result = await renderThroughLit(
    html`<unrelated-element foo="bar"></unrelated-element>`,
  );

  expect(result).toContain("<unrelated-element");
  expect(result).not.toContain("shadowrootmode");
});
