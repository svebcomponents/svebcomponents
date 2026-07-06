import { ElementRendererRegistry } from "@svebcomponents/ssr";
import { render } from "svelte/server";
import { test, expect } from "vitest";

import SyncComponentRenderer from "../../dist/server/sync-ssr.js";

import SyncSsrHost from "./SyncSsrHost.svelte";

// This project intentionally runs WITHOUT `svebcomponents({ async: true })`
// and WITHOUT svelte's `experimental.async`, i.e. the default configuration
// every consumer gets: the sync wrapper + `collectResultSync`.
test("renders a synchronous component through the sync wrapper", () => {
  ElementRendererRegistry.set("sync-component", SyncComponentRenderer);

  const res = render(SyncSsrHost, {
    props: {
      title: "Sync Test",
      count: 3,
      enabled: true,
    },
  });

  // Deliberately NOT awaited: since svelte 5.36, render() results are always
  // thenable, but the sync `body` getter must produce the full document for
  // synchronous components (regression test: renderShadow previously pushed
  // every result down the promise path, which collectResultSync rejects).
  expect(res.body).toContain(
    '<sync-component title="Sync Test" count="3" enabled="">',
  );
  expect(res.body).toContain('<template shadowrootmode="open">');
  expect(res.body).toContain("<h1>Sync Test</h1>");
  expect(res.body).toContain('<p id="count">Count: number-3</p>');
  expect(res.body).toContain('<p id="enabled">Enabled: boolean-true</p>');
});
