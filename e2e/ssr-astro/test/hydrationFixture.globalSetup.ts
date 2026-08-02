import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { experimental_AstroContainer as AstroContainer } from "astro/container";

import "@svebcomponents/ssr/enable-async";
import "@svebcomponents/e2e.ssr/sync";
import "@svebcomponents/e2e.ssr/sync/ssr";

import Page from "../src/Page.astro";

/**
 * Renders the Astro page through Astro's real rendering pipeline and writes
 * the markup for the browser-side test to parse.
 */
export default async function setup(): Promise<void> {
  const container = await AstroContainer.create();
  const fixture = await container.renderToString(Page as never, {
    props: { title: "Hydration Test" },
  });

  const outFile = fileURLToPath(
    new URL("./client/generated/hydration-fixture.html", import.meta.url),
  );
  await fs.mkdir(path.dirname(outFile), { recursive: true });
  await fs.writeFile(outFile, fixture);
}
