import { createSSRApp } from "vue";
import { renderToString } from "vue/server-renderer";
import { test, expect } from "vitest";

// asynchronous element renderers need Svelte's async SSR mode enabled;
// a non-Svelte host has to opt in explicitly
import "@svebcomponents/ssr/enable-async";

import { svebcomponents } from "@svebcomponents/ssr-vue";

// the real build artifacts of the shared e2e component package: the browser
// entry defines the custom elements, the /ssr entries register their renderers
import "@svebcomponents/e2e.ssr";
import "@svebcomponents/e2e.ssr/sync";
import "@svebcomponents/e2e.ssr/ssr";
import "@svebcomponents/e2e.ssr/sync/ssr";

import SyncApp from "../../src/SyncApp.vue";
import AsyncApp from "../../src/AsyncApp.vue";

const renderApp = async (component: unknown, props: Record<string, unknown>) => {
  const app = createSSRApp(component as never, props);
  app.use(svebcomponents());
  return renderToString(app);
};

test("renders a synchronous custom element to declarative shadow DOM", async () => {
  const html = await renderApp(SyncApp, { title: "Vue SSR" });

  expect(html).toContain("<sync-component");
  // the declarative shadow root must be the element's first child for the
  // parser to adopt it
  expect(html).toContain(
    // Vue serializes an empty-string attribute as a bare boolean attribute
    '<sync-component title="Vue SSR" count="3" enabled><template shadowrootmode="open">',
  );
  // the scoped class comes from the component's own <style> block
  expect(html).toContain(">Vue SSR</h1>");
  expect(html).toContain('<p id="count">Count: number-3</p>');
  expect(html).toContain('<p id="enabled">Enabled: boolean-true</p>');
});

test("keeps light-dom children outside the shadow template", async () => {
  const html = await renderApp(SyncApp, { title: "Vue SSR" });

  const shadowEnd = html.indexOf("</template>");
  const lightDom = html.indexOf('<p id="light-dom">');
  expect(shadowEnd).toBeGreaterThan(-1);
  expect(lightDom).toBeGreaterThan(shadowEnd);
});

test("renders an asynchronous element renderer without a sync/async split", async () => {
  // simple-component both awaits during render and has an async SsrPrepare
  // hook — the Svelte host needs its dedicated async wrapper for this, while
  // Vue's renderToString awaits the same component through the one wrapper
  const html = await renderApp(AsyncApp, { title: "Vue Async" });

  expect(html).toContain('<p id="async-label">Async: resolved</p>');
  expect(html).toContain(
    '<p id="prepared">Prepared: adjacent server module</p>',
  );
});

test("serializes rich props for the client to hydrate from", async () => {
  const html = await renderApp(AsyncApp, { title: "Vue Async" });

  expect(html).toContain('"prepared":{"source":"adjacent server module"}');
});

test("escapes untrusted values rendered into the shadow root", async () => {
  const html = await renderApp(SyncApp, {
    title: `"><img src=x onerror=alert(1)>`,
  });

  expect(html).not.toContain("<img");
  expect(html).toContain("&lt;img src=x onerror=alert(1)>");
});
