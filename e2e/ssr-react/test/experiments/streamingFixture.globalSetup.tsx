import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PassThrough } from "node:stream";

import { Suspense, use, createElement } from "react";
import { renderToPipeableStream } from "react-dom/server";

import "@svebcomponents/ssr/enable-async";
import "@svebcomponents/e2e.ssr/sync";
import "@svebcomponents/e2e.ssr/sync/ssr";
import { renderCustomElement } from "@svebcomponents/ssr";

/**
 * Renders a custom element inside a Suspense boundary through React's
 * *streaming* server renderer, in the two modes that differ for our purposes:
 *
 * - `onShellReady` streams the shell immediately and delivers the boundary's
 *   content later, out of band
 * - `onAllReady` waits for every boundary and emits one complete document
 *
 * The output of both is written out so the browser experiment can load them as
 * real documents — scripts and all — and observe what actually happens to the
 * declarative shadow root.
 */
const shadowPromise = renderCustomElement("sync-component", {
  title: "Streaming Test",
  count: "3",
});

const AsyncCustomElement = () => {
  const rendered = use(shadowPromise);
  return createElement(
    "sync-component",
    rendered.attributes,
    createElement("template", {
      key: "shadow",
      shadowrootmode: "open",
      dangerouslySetInnerHTML: { __html: rendered.shadowContent },
    }),
    createElement("p", { key: "light", id: "light-dom" }, "light dom child"),
  );
};

const App = () =>
  createElement(
    "div",
    { id: "app" },
    createElement(
      Suspense,
      { fallback: createElement("span", { id: "fallback" }, "loading") },
      createElement(AsyncCustomElement),
    ),
  );

const streamToString = (mode: "shell" | "all") =>
  new Promise<string>((resolve, reject) => {
    const sink = new PassThrough();
    let html = "";
    sink.on("data", (chunk) => (html += String(chunk)));
    sink.on("end", () => resolve(html));
    sink.on("error", reject);

    const { pipe } = renderToPipeableStream(createElement(App), {
      onShellReady() {
        if (mode === "shell") pipe(sink);
      },
      onAllReady() {
        if (mode === "all") pipe(sink);
      },
      onError: reject,
    });
  });

export default async function setup(): Promise<void> {
  const outDir = fileURLToPath(new URL("./generated/", import.meta.url));
  await fs.mkdir(outDir, { recursive: true });

  for (const mode of ["shell", "all"] as const) {
    await fs.writeFile(
      path.join(outDir, `streamed-${mode}.html`),
      await streamToString(mode),
    );
  }
}
