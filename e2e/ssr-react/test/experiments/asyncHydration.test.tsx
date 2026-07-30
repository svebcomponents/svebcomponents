import { test, expect, assert, vi } from "vitest";
import { Suspense, use, createElement } from "react";
import { hydrateRoot } from "react-dom/client";

import streamedShell from "./generated/streamed-shell.html?raw";

const nextMacrotask = () => new Promise((resolve) => setTimeout(resolve, 0));
const settle = async () => {
  for (let i = 0; i < 5; i++) await nextMacrotask();
};

/**
 * Replays React's streaming delivery inside the current document.
 *
 * `setHTMLUnsafe` parses the markup — which is what attaches the declarative
 * shadow root, including inside React's hidden staging container — but does
 * not execute scripts. The inline relocation scripts are therefore extracted
 * and evaluated in order, reproducing exactly what a browser does with a real
 * streamed response, in a document React can then hydrate.
 */
const replayStreamedDocument = async (html: string) => {
  document.body.setHTMLUnsafe(`<div id="page">${html}</div>`);
  const page = document.querySelector("#page");
  assert(page);

  for (const script of Array.from(page.querySelectorAll("script"))) {
    // eslint-disable-next-line no-eval -- reproducing the browser's own execution of React's inline relocation scripts
    (0, eval)(script.textContent ?? "");
  }
  // relocation is scheduled through requestAnimationFrame
  await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
  await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
  await settle();

  return page;
};

/**
 * The client-side counterpart of the streamed tree. The promise is already
 * resolved, standing in for a client that receives the shadow content it needs
 * without re-rendering the element.
 */
const makeApp = () => {
  const resolved = Promise.resolve(null);
  const AsyncCustomElement = () => {
    use(resolved);
    return createElement(
      "sync-component",
      { title: "Streaming Test", count: "3" },
      createElement("p", { key: "light", id: "light-dom" }, "light dom child"),
    );
  };
  return () =>
    createElement(
      "div",
      { id: "app" },
      createElement(
        Suspense,
        { fallback: createElement("span", { id: "fallback" }, "loading") },
        createElement(AsyncCustomElement),
      ),
    );
};

test("the streamed document is hydratable, and the shadow root survives it", async () => {
  const page = await replayStreamedDocument(streamedShell);

  const element = page.querySelector("sync-component");
  assert(element, "relocation must have run");
  const streamedShadowRoot = element.shadowRoot;
  assert(streamedShadowRoot, "the streamed shadow root must have attached");

  const streamedH1 = streamedShadowRoot.querySelector("h1");
  assert(streamedH1);
  streamedH1.setAttribute("data-streamed-node", "kept");

  // upgrade the element, then let React hydrate around it
  await import("@svebcomponents/e2e.ssr/sync");
  await customElements.whenDefined("sync-component");
  await settle();

  const recoverableErrors: string[] = [];
  const consoleError = vi
    .spyOn(console, "error")
    .mockImplementation(() => undefined);

  const App = makeApp();
  const root = hydrateRoot(page, createElement(App), {
    onRecoverableError: (error) => recoverableErrors.push(String(error)),
  });
  await settle();

  const complaints = consoleError.mock.calls
    .map((args) => args.map((arg) => String(arg)).join(" "))
    .filter(
      (message) =>
        message.includes("hydrat") ||
        message.includes("Hydration") ||
        message.includes("did not match"),
    );
  consoleError.mockRestore();

  expect(recoverableErrors).toEqual([]);
  expect(complaints).toEqual([]);

  // the element React hydrated is the one the stream delivered, shadow root
  // and server-rendered nodes intact
  expect(page.querySelector("sync-component")).toBe(element);
  expect(element.shadowRoot).toBe(streamedShadowRoot);
  expect(element.shadowRoot?.querySelector("h1")).toBe(streamedH1);
  expect(
    element.shadowRoot?.querySelector("h1")?.getAttribute("data-streamed-node"),
  ).toBe("kept");
  expect(element.shadowRoot?.querySelector("#count")?.textContent).toBe(
    "Count: number-3",
  );

  root.unmount();
});
