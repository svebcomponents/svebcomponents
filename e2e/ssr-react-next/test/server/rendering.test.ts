import { inject, test, expect, describe } from "vitest";

const baseUrl = inject("baseUrl");

const fetchRoute = async (route: string): Promise<string> => {
  const response = await fetch(`${baseUrl}${route}`);
  expect(response.status).toBe(200);
  return response.text();
};

/**
 * The markup React's Flight payload is replayed from, as it appears inside the
 * `self.__next_f.push([1, "..."])` calls Next inlines. Reading it as text is
 * enough for what these assertions need: whether a given element is *in* the
 * payload at all.
 */
const flightPayload = (html: string): string =>
  [...html.matchAll(/self\.__next_f\.push\(\[1,\s*"((?:[^"\\]|\\.)*)"\]\)/g)]
    .map((match) => match[1] ?? "")
    .join("");

describe("server component routes", () => {
  test("a plain dashed tag is server-rendered with declarative shadow DOM", async () => {
    const html = await fetchRoute("/rsc-sync");

    expect(html).toContain('<template shadowrootmode="open">');
    expect(html).toContain("<h1 ");
    expect(html).toContain("RSC Sync");
    // the renderer's own attribute output reached the host element
    expect(html).toMatch(/<sync-component[^>]*count="3"/);
    // light-dom children sit after the shadow template, not inside it
    expect(html).toMatch(/<\/template><p id="light-dom">/);
  });

  test("the /rsc wrapper server-renders an element the sync path cannot", async () => {
    const html = await fetchRoute("/rsc-async");

    // simple-component both awaits while rendering and has an async
    // SsrPrepare hook — the sync wrapper degrades to client-only on it
    expect(html).toContain('<p id="async-label">Async: resolved</p>');
    expect(html).toContain('<p id="prepared">Prepared: adjacent server module</p>');
  });

  test("an element inside a Suspense boundary survives out-of-order streaming", async () => {
    const html = await fetchRoute("/rsc-async-streamed");

    // the shell was flushed with the fallback, so the element arrived later in
    // one of React's `<div hidden>` payloads
    expect(html).toContain('<p id="fallback">loading</p>');
    expect(html).toContain('<template shadowrootmode="open">');
    expect(html).toContain("RSC Streamed");
  });

  test("the sync wrapper server-renders inside a Suspense boundary too", async () => {
    const html = await fetchRoute("/sync-streamed");

    expect(html).toContain('<p id="fallback">loading</p>');
    expect(html).toContain('<template shadowrootmode="open">');
    expect(html).toContain("Sync Streamed");
  });

  test("a client component's element is server-rendered too", async () => {
    const html = await fetchRoute("/client-component");

    expect(html).toContain('<template shadowrootmode="open">');
    expect(html).toContain("Client Island");
  });
});

describe("flight payload", () => {
  /**
   * The regression this suite was built around. A Server Component's return
   * value is serialized into the Flight payload and replayed in the browser,
   * so a `<template shadowrootmode>` emitted from one is replayed too — against
   * a DOM where the HTML parser has already consumed it into a shadow root.
   * React reports the missing child as a hydration mismatch, discards the
   * server DOM, and re-creates the template through DOM APIs, which attaches
   * no shadow root at all.
   *
   * The wrappers avoid this by emitting the template from a Client Component,
   * which React runs in the SSR pass *and* in the browser. Asserting on the
   * payload rather than only on the hydrated DOM keeps the reason legible: a
   * change that moves the template back into a Server Component fails here,
   * naming the cause, instead of only failing an opaque DOM assertion.
   */
  test.each([["/rsc-sync"], ["/rsc-async"]])(
    "%s does not replay the shadow template to the client",
    async (route) => {
      const html = await fetchRoute(route);

      expect(html).toContain('<template shadowrootmode="open">');
      expect(flightPayload(html)).not.toContain("shadowrootmode");
    },
  );
});
