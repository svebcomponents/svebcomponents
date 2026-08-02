import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { renderToString } from "react-dom/server";

import "@svebcomponents/e2e.ssr/sync";
import "@svebcomponents/e2e.ssr/sync/ssr";

import SyncApp from "../src/SyncApp.js";

/**
 * Renders the React app through React's real SSR pipeline and writes the
 * markup for the browser-side hydration test to parse via `setHTMLUnsafe`.
 *
 * `renderToString` rather than `renderToStaticMarkup`: the hydration test
 * needs the same output a real server would send to a client that then calls
 * `hydrateRoot`.
 */
export default async function setup(): Promise<void> {
  const fixture = renderToString(<SyncApp title="Hydration Test" />);

  const outFile = fileURLToPath(
    new URL("./client/generated/hydration-fixture.html", import.meta.url),
  );
  await fs.mkdir(path.dirname(outFile), { recursive: true });
  await fs.writeFile(outFile, fixture);
}
