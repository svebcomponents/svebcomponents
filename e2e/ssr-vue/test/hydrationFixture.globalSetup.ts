import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createSSRApp } from "vue";
import { renderToString } from "vue/server-renderer";

import { svebcomponents } from "@svebcomponents/ssr-vue";

import "@svebcomponents/e2e.ssr/sync";
import "@svebcomponents/e2e.ssr/sync/ssr";

import SyncApp from "../src/SyncApp.vue";

/**
 * Renders the Vue app through Vue's real SSR pipeline and writes the markup
 * for the browser-side hydration test to parse via `setHTMLUnsafe`.
 *
 * Using `renderToString` rather than a hand-built fixture is the point: what
 * the hydration test needs to prove is that Vue's *own* server output parses
 * into a declarative shadow root and that Vue's client hydration then claims
 * the element instead of re-creating it.
 */
export default async function setup(): Promise<void> {
  const app = createSSRApp(SyncApp, { title: "Hydration Test" });
  app.use(svebcomponents());

  const fixture = await renderToString(app);

  const outFile = fileURLToPath(
    new URL("./client/generated/hydration-fixture.html", import.meta.url),
  );
  await fs.mkdir(path.dirname(outFile), { recursive: true });
  await fs.writeFile(outFile, fixture);
}
