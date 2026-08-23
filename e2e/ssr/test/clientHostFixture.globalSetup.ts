import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ElementRendererRegistry } from "@svebcomponents/ssr";
import { render } from "svelte/server";

import SyncComponentRenderer from "../dist/server/sync-ssr.js";

// The very same host component the browser-side wrapper test mounts — here it
// goes through the *server* wrapper instead. Rendering one file both ways is
// what makes the resulting fixture a faithful hydration target.
import ClientHost from "./client-host/ClientHost.svelte";

/**
 * Server-renders a svelte host that passes camelCase props to a custom
 * element, so the browser-side test can hydrate over the real markup a
 * SvelteKit page would ship.
 */
export default async function setup(): Promise<void> {
  ElementRendererRegistry.set("sync-component", SyncComponentRenderer);

  const { body } = await render(ClientHost, {
    props: {
      title: "Hydrated Host",
      count: 3,
      showLabel: true,
      richDetail: { note: "rich prop survived hydration" },
    },
  });

  const outFile = fileURLToPath(
    new URL("./client-host/generated/host-fixture.html", import.meta.url),
  );
  await fs.mkdir(path.dirname(outFile), { recursive: true });
  await fs.writeFile(outFile, body);
}
