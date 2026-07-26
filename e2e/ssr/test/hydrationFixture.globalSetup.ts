import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { collectResultSync } from "@lit-labs/ssr/lib/render-result.js";

// The real server-side pipeline: the generated renderer entry produced by
// @svebcomponents/build (which renders through the server-compiled
// HydrationHost). Using it directly keeps this fixture faithful to actual
// SSR output without needing a host page or the lit-ssr pipeline.
import SyncComponentRenderer from "../dist/server/sync-ssr.js";

/**
 * Renders the sync test component to a declarative-shadow-DOM HTML fixture
 * that the browser-side hydration test parses via `setHTMLUnsafe`.
 */
export default async function setup(): Promise<void> {
  const renderer = new SyncComponentRenderer("sync-component");
  renderer.setAttribute("title", "Hydration Test");
  renderer.setAttribute("count", "3");
  renderer.setAttribute("enabled", "");
  // rich prop with no attribute representation: must round-trip through the
  // serialized-props channel for the client to hydrate without a mismatch
  renderer.setProperty("meta", { note: "rich prop survived" });

  const shadow = collectResultSync(
    // the render info object is unused by our renderer
    renderer.renderShadow({} as never),
  );
  const attributes = collectResultSync(renderer.renderAttributes());

  const fixture = `<sync-component${attributes}><template shadowrootmode="open">${shadow}</template></sync-component>`;

  const outFile = fileURLToPath(
    new URL("./client/generated/hydration-fixture.html", import.meta.url),
  );
  await fs.mkdir(path.dirname(outFile), { recursive: true });
  await fs.writeFile(outFile, fixture);
}
